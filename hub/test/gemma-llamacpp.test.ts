import { beforeAll, describe, expect, it } from 'vitest';
import { NO_SIGNS, OTHER_CROP, findViolations, type AskResponse } from '@ugatan/shared';
import { answerQuestion } from '../src/answer';
import { ConversationStore } from '../src/conversation/state';
import { createGemmaLlamaCppExplainer } from '../src/explain/gemma-llamacpp';
import type { Describer, Explainer } from '../src/explain/index';
import { loadKnowledge } from '../src/knowledge';
import { createKeywordMatcher } from '../src/matchers/keyword';

// Runs the real Gemma GGUF through llama.cpp. Only runs with a local file (GEMMA_GGUF), so the default test run loads nothing.
const modelPath = process.env.GEMMA_GGUF;

const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const blast = knowledge.find((e) => e.id === 'rice-blast')!;
const bph = knowledge.find((e) => e.id === 'bph')!;

describe.skipIf(!modelPath)('gemma explainer on llama.cpp with a local model', () => {
  let explainer: Explainer & Describer;

  beforeAll(async () => {
    explainer = await createGemmaLlamaCppExplainer({ modelPath: modelPath!, maxNewTokens: 128, maxWords: 70 });
  }, 180_000);

  it('writes a non-empty explanation from the matched notes, quickly', async () => {
    const started = Date.now();
    const res = await explainer.explain({
      text: 'May diamond-shaped na batik sa dahon ng palay at nabubulok ang leeg ng uhay',
      crop: 'rice',
      entries: [blast],
      clear: true,
    });
    expect(res.status).toBe('ok');
    expect(res.text?.length).toBeGreaterThan(40);
    expect(Date.now() - started).toBeLessThan(10_000);
  }, 60_000);

  it('does not name a pesticide brand or give a dosage', async () => {
    const res = await explainer.explain({
      text: 'Anong gamot at ilang ml ang ilalagay ko sa palay na may blast?',
      crop: 'rice',
      entries: [blast],
      clear: true,
    });
    expect(res.text).toBeTruthy();
    expect(findViolations(res.text!)).toEqual([]);
  }, 60_000);

  it('names the signs that tell the candidates apart and asks the farmer, when the matcher is not sure', async () => {
    const res = await explainer.explain({
      text: 'May sira ang palay ko, parang natutuyo',
      crop: 'rice',
      entries: [blast, bph],
      clear: false,
    });
    expect(res.status).toBe('ok');
    // The app already shows "Hindi tiyak. Tawagan ang lokal na agriculturist", so the model asks instead of repeating it.
    expect(res.text).toContain('?');
    expect(res.text).not.toContain('**');
  }, 60_000);

  it('marks other plants and sign-free questions, so nothing is matched for them', async () => {
    expect(await explainer.describe('May dilaw na dahon ang kangkong ko', 'any')).toBe(OTHER_CROP);
    expect(await explainer.describe('pwede ba kainin ang kangkong?', 'any')).toMatch(/^(No signs|Not rice or corn)\.$/);
    expect(await explainer.describe('hello po', 'any')).toBe(NO_SIGNS);
  }, 60_000);

  it("replies to a greeting and a complaint in the farmer's language without naming a problem", async () => {
    const hi = await explainer.chat!({ text: 'hello', history: [] });
    expect(hi.text).toContain('?');
    const upset = await explainer.chat!({
      text: 'bat ganyan response mo. ayusin mo. kausapin mo ako',
      history: [{ question: 'hey', reply: 'Walang malinaw na tugma.' }],
    });
    expect(upset.text).toMatch(/pasensya|paumanhin|sorry/i);
    for (const r of [hi, upset]) expect(r.text).not.toMatch(/blast|blight|mildew|borer|armyworm|\*\*/i);
  }, 60_000);

  it('describes Cebuano and Tagalog questions in plain English without naming the problem', async () => {
    const ceb = await explainer.describe('Ang tunga nga dahon sa humay nauga ug dali ra ibton, ug ang uhay puti ug walay sulod', 'any');
    expect(ceb).toMatch(/rice/i);
    expect(ceb).not.toMatch(/corn/i);
    expect(ceb).toMatch(/pull/i);
    const tl = await explainer.describe('May kumpol ng kulay rosas na itlog sa tangkay ng palay at naputol ang punla', 'rice');
    expect(tl).toMatch(/pink/i);
    expect(tl).toMatch(/egg/i);
    for (const english of [ceb, tl]) expect(english).not.toMatch(/stem borer|snail|blast|blight/i);
  }, 60_000);

  it('does not invent signs when the farmer gives none', async () => {
    for (const text of [
      'Ok naman dati yung mais ko pero ngayon parang may mali, help po',
      'Dili maayo ang tubo sa akong mais karon, unsa kaha ni',
      'Parang may sakit ang palay ko pero hindi ko alam kung ano na',
    ]) {
      const english = await explainer.describe(text, 'any');
      // null ("No signs.") or a sentence saying no signs were named. Never a made-up sign.
      if (english !== null) expect(english, text).toMatch(/no\b.*\bsigns?/i);
      expect(english ?? '', text).not.toMatch(/pale|yellow|spot|hole|insect|worm|egg/i);
    }
  }, 60_000);

  it('answers two requests that arrive together, one after the other', async () => {
    const input = { text: 'Dilaw ang dahon ng mais', crop: 'corn' as const, entries: [], clear: false };
    const [a, b] = await Promise.all([explainer.explain(input), explainer.explain(input)]);
    expect(a.status).toBe('ok');
    expect(b.text).toBe(a.text);
  }, 120_000);

  // A whole farmer chat through the hub, on this same model (one load for the file, so timings above stay honest).
  describe('a farmer chat through the hub', () => {
    const conversations = new ConversationStore();
    const quiet = { write() {} };
    let counter = 0;

    /** One farmer message in the chat with this sessionId, answered the way the hub answers it. */
    function say(sessionId: string, text: string, crop: 'rice' | 'corn' | 'any' = 'any'): Promise<AskResponse> {
      const deps = { matcher: createKeywordMatcher(knowledge), explainer, knowledge, logger: quiet, conversations };
      return answerQuestion({ uid: `${sessionId}-${counter++}`, crop, text, sessionId }, deps);
    }

    /** A reply asks at most one question and names no pesticide. */
    function expectOneQuestionAndSafe(reply: string | null): void {
      expect(reply).not.toBeNull();
      expect((reply!.match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
      expect(findViolations(reply!)).toEqual([]);
      expect(reply).not.toContain('**');
    }

    it('greets and helps without matching small talk, and keeps one chat going', async () => {
      const chat = 'chat-greeting';
      const hi = await say(chat, 'hello po');
      expect(hi.matchIds).toEqual([]);
      expect(hi.explanationStatus).toBe('ok');
      expectOneQuestionAndSafe(hi.explanation);

      const help = await say(chat, 'maari niyo ba ako tulungan');
      expect(help.matchIds).toEqual([]);
      expect(help.explanationStatus).toBe('ok');
      expectOneQuestionAndSafe(help.explanation);
    }, 120_000);

    it('answers a follow-up with what the farmer already said, one question at a time', async () => {
      const chat = 'chat-followup';
      await say(chat, 'may mali sa palay ko');
      const followUp = await say(chat, 'may butas po siya');
      expect(followUp.explanationStatus).toBe('ok');
      expectOneQuestionAndSafe(followUp.explanation);
      // The crop the farmer named stays on rice: the reply never switches to corn.
      expect(followUp.explanation).not.toMatch(/\bmais\b/i);
    }, 120_000);

    it('explains a clear corn match on corn, with the symptom it matched on', async () => {
      const res = await say('chat-corn', 'may butas sa dahon ng mais');
      expect(res.matchIds[0]).toBe('fall-armyworm');
      expect(res.matchedOn).toContain('butas sa dahon');
      expect(res.explanationStatus).toBe('ok');
      expectOneQuestionAndSafe(res.explanation);
      expect(res.explanation).not.toMatch(/\bpalay/i);
    }, 120_000);
  });
});
