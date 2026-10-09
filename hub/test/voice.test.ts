import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AUDIO_SAMPLE_RATE, MAX_AUDIO_CHARS, MAX_AUDIO_SECONDS, NO_SPEECH, type TranscribeResponse } from '@ugatan/shared';
import { readAudio } from '../src/audio';
import type { AudioTranscriber } from '../src/explain/index';
import { offExplainer } from '../src/explain/index';
import { loadKnowledge } from '../src/knowledge';
import type { LogEvent } from '../src/log';
import { createKeywordMatcher } from '../src/matchers/keyword';
import { MAX_IMAGE_BODY_BYTES } from '../src/answer';
import { createHubServer } from '../src/server';
import { parseTranscribeRequest, transcribeSpeech } from '../src/transcribe';

const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));

/** A recording of this many seconds: a tone of 16-bit samples, base64 encoded. */
function recording(seconds: number, amplitude = 8000): string {
  const count = Math.round(seconds * AUDIO_SAMPLE_RATE);
  const bytes = Buffer.alloc(count * 2);
  for (let i = 0; i < count; i++) bytes.writeInt16LE(Math.round(Math.sin(i / 20) * amplitude), i * 2);
  return bytes.toString('base64');
}

function fakeTranscriber(answer: string | null | Error) {
  const t = {
    name: 'fake-audio',
    heard: [] as Float32Array[],
    async transcribe(samples: Float32Array) {
      t.heard.push(samples);
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return t satisfies AudioTranscriber;
}

describe('recording from the phone', () => {
  it('reads 16-bit samples into floats between -1 and 1', () => {
    const read = readAudio(recording(1));
    if ('error' in read) throw new Error(read.error);
    expect(read.samples).toHaveLength(AUDIO_SAMPLE_RATE);
    expect(read.seconds).toBe(1);
    expect(Math.max(...read.samples)).toBeCloseTo(8000 / 32768, 2);
    expect(Math.min(...read.samples)).toBeCloseTo(-8000 / 32768, 2);
  });

  it('keeps the byte order: little-endian', () => {
    // 0x0100 little-endian is 1, and 0x8000 is -32768. A tap-length recording is padded to the minimum.
    const bytes = Buffer.alloc(AUDIO_SAMPLE_RATE * 2);
    bytes.writeInt16LE(256, 0);
    bytes.writeInt16LE(-32768, 2);
    const read = readAudio(bytes.toString('base64'));
    if ('error' in read) throw new Error(read.error);
    expect(read.samples[0]).toBeCloseTo(256 / 32768, 6);
    expect(read.samples[1]).toBe(-1);
  });

  it('refuses audio that is not base64, not whole samples, too short, or too long', () => {
    expect(readAudio('not base64!!')).toEqual({ error: expect.stringContaining('base64') });
    expect(readAudio(Buffer.alloc(AUDIO_SAMPLE_RATE * 2 + 1).toString('base64'))).toEqual({ error: expect.stringContaining('16-bit') });
    expect(readAudio(recording(0.1))).toEqual({ error: expect.stringContaining('at least') });
    expect(readAudio(recording(MAX_AUDIO_SECONDS + 1))).toEqual({ error: expect.stringContaining('at most') });
  });

  it('allows the longest recording within the field limit', () => {
    const longest = recording(MAX_AUDIO_SECONDS);
    expect(longest.length).toBeLessThanOrEqual(MAX_AUDIO_CHARS);
    expect(readAudio(longest)).toHaveProperty('samples');
    // The server reads a body this large before it parses it.
    expect(MAX_AUDIO_CHARS + 64).toBeLessThan(MAX_IMAGE_BODY_BYTES);
  });
});

describe('request body', () => {
  it('needs an audio string', () => {
    expect(parseTranscribeRequest(null)).toContain('object');
    expect(parseTranscribeRequest({})).toContain('audio');
    expect(parseTranscribeRequest({ audio: '' })).toContain('audio');
    expect(parseTranscribeRequest({ audio: 5 })).toContain('audio');
    expect(parseTranscribeRequest({ audio: 'AAAA' })).toEqual({ audio: 'AAAA' });
  });
});

describe('transcribeSpeech', () => {
  const events: LogEvent[] = [];
  const logger = { write: (e: LogEvent) => events.push(e) };

  it('returns what the model heard, cleaned, and logs its length but not its words', async () => {
    events.length = 0;
    const t = fakeTranscriber('  May butas\nang dahon ng mais  ');
    const res = await transcribeSpeech(recording(2), { transcriber: t, logger });
    expect(res).toEqual({ status: 'ok', text: 'May butas ang dahon ng mais' });
    expect(t.heard).toHaveLength(1);
    expect(t.heard[0]).toHaveLength(2 * AUDIO_SAMPLE_RATE);
    expect(events).toContainEqual(expect.objectContaining({ event: 'voice', status: 'ok', chars: 27 }));
    expect(JSON.stringify(events)).not.toContain('butas');
  });

  it('says empty for silence', async () => {
    expect(await transcribeSpeech(recording(2), { transcriber: fakeTranscriber(NO_SPEECH), logger })).toEqual({ status: 'empty', text: null });
    expect(await transcribeSpeech(recording(2), { transcriber: fakeTranscriber(null), logger })).toEqual({ status: 'empty', text: null });
  });

  it('says unreadable for a bad recording, without calling the model', async () => {
    const t = fakeTranscriber('x');
    expect(await transcribeSpeech('not base64!!', { transcriber: t, logger })).toEqual({ status: 'unreadable', text: null });
    expect(t.heard).toHaveLength(0);
  });

  it('says unreadable when the model fails, and logs why', async () => {
    events.length = 0;
    const res = await transcribeSpeech(recording(2), { transcriber: fakeTranscriber(new Error('out of memory')), logger });
    expect(res).toEqual({ status: 'unreadable', text: null });
    expect(events).toContainEqual({ event: 'error', where: 'voice', message: 'out of memory' });
  });

  it('says unavailable when the hub has no audio model', async () => {
    expect(await transcribeSpeech(recording(2), { logger })).toEqual({ status: 'unavailable', text: null });
  });
});

describe('POST /transcribe', () => {
  let withModel: Server;
  let without: Server;
  let withBase = '';
  let withoutBase = '';

  function start(transcriber?: AudioTranscriber): Promise<{ server: Server; base: string }> {
    const server = createHubServer({
      matcher: createKeywordMatcher(knowledge),
      explainer: offExplainer,
      knowledge,
      logger: { write() {} },
      transcriber,
      info: { matcher: 'keyword', explainer: 'off', vision: 'off', voice: transcriber ? 'on' : 'off' },
    });
    return new Promise((resolve) =>
      server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })),
    );
  }

  beforeAll(async () => {
    ({ server: withModel, base: withBase } = await start(fakeTranscriber('Dilaw ang dahon ng palay')));
    ({ server: without, base: withoutBase } = await start());
  });
  afterAll(async () => {
    await Promise.all([withModel, without].map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
  });

  const post = (base: string, body: unknown) =>
    fetch(`${base}/transcribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

  it('transcribes a recording', async () => {
    const res = await post(withBase, { audio: recording(1) });
    expect(res.status).toBe(200);
    expect((await res.json()) as TranscribeResponse).toEqual({ status: 'ok', text: 'Dilaw ang dahon ng palay' });
  });

  it('says unavailable on a hub without the audio model', async () => {
    const res = await post(withoutBase, { audio: recording(1) });
    expect(res.status).toBe(200);
    expect(((await res.json()) as TranscribeResponse).status).toBe('unavailable');
  });

  it('reports voice in /health', async () => {
    expect(await (await fetch(`${withBase}/health`)).json()).toMatchObject({ voice: 'on' });
    expect(await (await fetch(`${withoutBase}/health`)).json()).toMatchObject({ voice: 'off' });
  });

  it('rejects a body that is not JSON, has no audio, or is too large', async () => {
    expect((await post(withBase, '{nope')).status).toBe(400);
    expect((await post(withBase, {})).status).toBe(400);
    expect((await post(withBase, { audio: 'A'.repeat(MAX_IMAGE_BODY_BYTES + 10) })).status).toBe(413);
  });
});
