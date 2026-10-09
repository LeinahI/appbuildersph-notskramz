import { describe, expect, it } from 'vitest';
import { NO_SIGNS, OTHER_CROP, MAX_IMAGE_CHARS, type KnowledgeEntry } from '@ugatan/shared';
import { answerQuestion, parseAskRequest } from '../src/answer';
import { decodeBase64, jpegInfo, readPhoto } from '../src/image';
import type { ChatInput, ExplainInput, Explainer, ImageDescriber } from '../src/explain/index';
import { loadKnowledge } from '../src/knowledge';
import { createKeywordMatcher } from '../src/matchers/keyword';
import type { LogEvent } from '../src/log';
import type { MatchOutcome, Matcher } from '../src/matchers/index';

const knowledge: KnowledgeEntry[] = loadKnowledge(new URL('../../knowledge/', import.meta.url));

/** The header of a JPEG: SOI, a JFIF segment, then a baseline frame header with the given size. */
function jpegHeader(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ]);
}
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const PHOTO = b64(jpegHeader(640, 480));

describe('JPEG header', () => {
  it('reads the size without decoding', () => {
    expect(jpegInfo(jpegHeader(640, 480))).toEqual({ width: 640, height: 480 });
    expect(jpegInfo(jpegHeader(4000, 3000))).toEqual({ width: 4000, height: 3000 });
  });

  it('refuses bytes that are not a JPEG', () => {
    expect(jpegInfo(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
    expect(jpegInfo(new Uint8Array(0))).toBeNull();
    expect(jpegInfo(Uint8Array.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it('refuses a JPEG with no frame header before the scan', () => {
    expect(jpegInfo(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02]))).toBeNull();
  });

  it('refuses a JPEG with a zero size', () => {
    expect(jpegInfo(jpegHeader(0, 0))).toBeNull();
  });

  it('accepts base64 with or without a data URL prefix, and refuses anything else', () => {
    expect(decodeBase64(PHOTO)).not.toBeNull();
    expect(decodeBase64(`data:image/jpeg;base64,${PHOTO}`)).not.toBeNull();
    expect(decodeBase64('not base64!!')).toBeNull();
    expect(decodeBase64('')).toBeNull();
  });

  it('refuses a photo that is too large in pixels', () => {
    expect(readPhoto(PHOTO)).toHaveProperty('bytes');
    expect(readPhoto(b64(jpegHeader(5000, 1000)))).toEqual({ error: expect.stringContaining('pixels') });
    expect(readPhoto(b64(Uint8Array.from([1, 2, 3, 4])))).toEqual({ error: expect.stringContaining('JPEG') });
  });
});

describe('photo field of a request', () => {
  const base = { uid: 'a', crop: 'any', text: 'Litrato' };

  it('keeps a photo', () => {
    expect(parseAskRequest({ ...base, image: PHOTO })).toMatchObject({ image: PHOTO });
  });

  it.each([[42], [''], ['x'.repeat(MAX_IMAGE_CHARS + 1)]])('rejects a bad photo field (%#)', (image) => {
    expect(parseAskRequest({ ...base, image })).toContain('image');
  });
});

/** Stands in for the vision model: returns a fixed answer and records what it was shown. */
function fakeVision(answer: string | null | Error): ImageDescriber & { calls: { bytes: number; note: string }[] } {
  const v = {
    name: 'fake-vision',
    calls: [] as { bytes: number; note: string }[],
    async describeImage(image: Uint8Array, note: string) {
      v.calls.push({ bytes: image.length, note });
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return v;
}

/** Stands in for Gemma: records what it was asked to explain or chat about. */
function recorder() {
  const e = {
    name: 'gemma',
    explained: [] as ExplainInput[],
    chats: [] as ChatInput[],
    async explain(input: ExplainInput) {
      e.explained.push(input);
      return { status: 'ok' as const, text: 'Tingnan ang dahon.' };
    },
    async chat(input: ChatInput) {
      e.chats.push(input);
      return { status: 'ok' as const, text: 'Ano po ang nakikita ninyo?' };
    },
  };
  return e satisfies Explainer;
}

/** The keyword matcher, recording the text it was asked to match. */
function spyMatcher() {
  const inner = createKeywordMatcher(knowledge);
  const seen: string[] = [];
  const m: Matcher & { seen: string[] } = {
    name: inner.name,
    seen,
    async match(text, crop): Promise<MatchOutcome> {
      seen.push(text);
      return inner.match(text, crop);
    },
  };
  return m;
}

async function ask(vision: ImageDescriber | undefined, over: { text?: string; image?: string } = {}) {
  const explainer = recorder();
  const matcher = spyMatcher();
  const events: LogEvent[] = [];
  const res = await answerQuestion(
    { uid: 'p1', crop: 'any', text: over.text ?? 'Tingnan po ang litrato ng palay ko', image: over.image ?? PHOTO },
    { matcher, explainer, knowledge, logger: { write: (e) => events.push(e) }, imageDescriber: vision },
  );
  return { res, explainer, matcher, events };
}

describe('a question with a photo', () => {
  it('matches on the signs the photo shows together with the farmer words', async () => {
    const vision = fakeVision('Rice leaf with diamond shaped spots that have a gray center.');
    const { res, matcher, explainer, events } = await ask(vision);

    expect(vision.calls).toEqual([{ bytes: jpegHeader(640, 480).length, note: 'Tingnan po ang litrato ng palay ko' }]);
    expect(matcher.seen[0]).toContain('Tingnan po ang litrato ng palay ko');
    expect(matcher.seen[0]).toContain('diamond shaped spots');
    expect(res.matchIds).toContain('rice-blast');
    expect(res.photo).toBe('ok');
    expect(res.photoSigns).toBe('Rice leaf with diamond shaped spots that have a gray center.');
    expect(explainer.explained).toHaveLength(1);
    expect(events).toContainEqual(expect.objectContaining({ event: 'photo', uid: 'p1', status: 'ok' }));
  });

  it('goes to matching even when the words are unknown to the keywords', async () => {
    const { res, explainer, matcher } = await ask(fakeVision('Some unusual marks on the stalk.'));
    expect(matcher.seen).toHaveLength(1);
    expect(res.photo).toBe('ok');
    // Nothing matched, so the chat replies; the photo did not turn into a made-up problem.
    expect(res.matchIds).toEqual([]);
    expect(explainer.chats).toHaveLength(1);
  });

  it('tells the chat reply when the photo is not rice or corn, and does not match it', async () => {
    const { res, explainer, matcher } = await ask(fakeVision(OTHER_CROP));
    expect(res.photo).toBe('not-plant');
    expect(res.photoSigns).toBeNull();
    expect(matcher.seen).toHaveLength(0);
    expect(explainer.chats[0]!.text).toContain('does not show rice or corn');
  });

  it('tells the chat reply when the photo shows no sign, and does not match it', async () => {
    const { res, explainer, matcher } = await ask(fakeVision(NO_SIGNS));
    expect(res.photo).toBe('no-signs');
    expect(matcher.seen).toHaveLength(0);
    expect(explainer.chats[0]!.text).toContain('no clear sign');
  });

  it('keeps the matcher on the farmer words when the photo shows nothing useful', async () => {
    const { res, matcher } = await ask(fakeVision(NO_SIGNS), { text: 'Diamond shaped spots on my rice leaf' });
    expect(res.photo).toBe('no-signs');
    expect(matcher.seen[0]).toBe('Diamond shaped spots on my rice leaf');
    expect(matcher.seen[0]).not.toContain('photo');
  });

  it('drops a photo description that names a pesticide', async () => {
    const { res, matcher } = await ask(fakeVision('Brown spots on the leaf. Spray Karate 2 ml per liter.'));
    expect(res.photo).toBe('unreadable');
    expect(res.photoSigns).toBeNull();
    expect(matcher.seen.join(' ')).not.toContain('Karate');
  });

  it('answers from the farmer words when the vision model fails', async () => {
    const { res, events } = await ask(fakeVision(new Error('out of memory')), { text: 'Diamond shaped spots on my rice leaf' });
    expect(res.photo).toBe('unreadable');
    expect(res.matchIds.length).toBeGreaterThan(0);
    expect(events).toContainEqual({ event: 'error', where: 'photo', message: 'out of memory' });
  });

  it('refuses a photo that is not a JPEG without calling the model', async () => {
    const vision = fakeVision('Rice leaf with spots.');
    const { res } = await ask(vision, { image: b64(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])) });
    expect(res.photo).toBe('unreadable');
    expect(vision.calls).toHaveLength(0);
  });

  it('says the photo was not read when the hub has no vision model', async () => {
    const { res } = await ask(undefined, { text: 'Diamond shaped spots on my rice leaf' });
    expect(res.photo).toBe('unavailable');
    expect(res.matchIds.length).toBeGreaterThan(0);
  });

  it('does not report a photo status for a question without a photo', async () => {
    const res = await answerQuestion(
      { uid: 'p2', crop: 'any', text: 'Diamond shaped spots on my rice leaf' },
      { matcher: spyMatcher(), explainer: recorder(), knowledge, logger: { write() {} }, imageDescriber: fakeVision('x') },
    );
    expect(res).not.toHaveProperty('photo');
    expect(res).not.toHaveProperty('photoSigns');
  });
});

describe("a photo with no sign in the farmer's words", () => {
  it('is not sure from one picked sign, even when that sign carries several keywords', async () => {
    // "Wet-looking stripes on the leaf edges" alone hits three bacterial leaf blight keywords.
    const { res, explainer } = await ask(fakeVision('rice\nwet-looking stripes on the leaf edges'), { text: 'ano ang mali' });
    expect(res.matchIds[0]).toBe('bacterial-leaf-blight');
    expect(res.clear).toBe(false);
    expect(explainer.explained[0]!.clear).toBe(false);
  });

  it('is sure when two different picked signs point to the same problem', async () => {
    const vision = fakeVision('corn\nragged holes\nyoung leaves in the whorl\nsawdust-like droppings');
    const { res } = await ask(vision, { text: 'ano ang mali' });
    expect(res.matchIds[0]).toBe('fall-armyworm');
    expect(res.clear).toBe(true);
  });

  it("leaves the farmer's own sign words to the matcher as usual", async () => {
    const { res } = await ask(fakeVision('rice\nwet-looking stripes on the leaf edges'), { text: 'tuyo ang gilid ng dahon ng palay, may guhit' });
    expect(res.matchIds[0]).toBe('bacterial-leaf-blight');
    expect(res.clear).toBe(true);
  });
});

