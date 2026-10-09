import { describe, expect, it } from 'vitest';
import type { KnowledgeEntry } from '@ugatan/shared';
import { answerQuestion, parseAskRequest } from '../src/answer';
import type { ChatInput, ExplainInput, Explainer } from '../src/explain/index';
import { loadKnowledge } from '../src/knowledge';
import type { LogEvent } from '../src/log';
import type { MatchOutcome, Matcher } from '../src/matchers/index';

const knowledge: KnowledgeEntry[] = loadKnowledge(new URL('../../knowledge/', import.meta.url));

/** Stands in for Laya or hybrid: returns a fixed verdict. */
function matcher(outcome: MatchOutcome): Matcher {
  return { name: 'laya', async match() { return outcome; } };
}

/** Stands in for Gemma: records what it was asked to explain. */
function recorder(): Explainer & { calls: ExplainInput[] } {
  const e = {
    name: 'gemma',
    calls: [] as ExplainInput[],
    async explain(input: ExplainInput) {
      e.calls.push(input);
      return { status: 'ok' as const, text: 'Tingnan ang dahon.' };
    },
  };
  return e;
}

async function run(outcome: MatchOutcome) {
  const explainer = recorder();
  const events: LogEvent[] = [];
  const res = await answerQuestion(
    { uid: 'u1', crop: 'rice', text: 'May batik ang dahon' },
    { matcher: matcher(outcome), explainer, knowledge, logger: { write: (e) => events.push(e) } },
  );
  return { res, calls: explainer.calls, events };
}

describe('matcher and explainer together', () => {
  it('gives the explainer only the problem the matcher is sure of', async () => {
    const { res, calls } = await run({ ids: ['rice-blast', 'bph'], clear: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.entries.map((e) => e.id)).toEqual(['rice-blast']);
    expect(calls[0]!.clear).toBe(true);
    // The phone still gets both ids, to show the curated notes.
    expect(res.matchIds).toEqual(['rice-blast', 'bph']);
    expect(res.explanationStatus).toBe('ok');
  });

  it('gives the explainer every candidate, marked not sure, when the matcher is not sure', async () => {
    const { res, calls } = await run({ ids: ['rice-blast', 'bph'], clear: false });
    expect(calls[0]!.entries.map((e) => e.id)).toEqual(['rice-blast', 'bph']);
    expect(calls[0]!.clear).toBe(false);
    expect(res.clear).toBe(false);
  });

  it('skips the explainer when nothing matched', async () => {
    const { res, calls, events } = await run({ ids: [], clear: false });
    expect(calls).toHaveLength(0);
    expect(res.explanationStatus).toBe('unavailable');
    expect(res.explanation).toBeNull();
    expect(events).toContainEqual({ event: 'explanation', uid: 'u1', status: 'skipped-no-match', chars: 0 });
  });

  it('replies to what the farmer said, with the earlier turns, when nothing matched', async () => {
    const chats: ChatInput[] = [];
    const explainer: Explainer = {
      name: 'gemma',
      async explain() {
        throw new Error('nothing to explain');
      },
      async chat(input) {
        chats.push(input);
        return { status: 'ok', text: 'Pasensya na po. Ano ang nakikita ninyo sa dahon?' };
      },
    };
    const events: LogEvent[] = [];
    const history = [{ question: 'hey', reply: 'Walang malinaw na tugma.' }];
    const res = await answerQuestion(
      { uid: 'u2', crop: 'any', text: 'bat ganyan response mo, kausapin mo ako', history },
      { matcher: matcher({ ids: [], clear: false, noSigns: true }), explainer, knowledge, logger: { write: (e) => events.push(e) } },
    );
    expect(chats).toHaveLength(1);
    expect(chats[0]).toMatchObject({ text: 'bat ganyan response mo, kausapin mo ako', history });
    expect(res.matchIds).toEqual([]);
    expect(res.explanationStatus).toBe('ok');
    expect(res.explanation).toMatch(/nakikita/);
    expect(events).toContainEqual({ event: 'explanation', uid: 'u2', status: 'chat-ok', chars: res.explanation!.length });
    // A greeting or complaint is not a crop problem the hub missed.
    expect(events.some((e) => e.event === 'escalation')).toBe(false);
  });

  it('blocks a chat reply that names a pesticide brand', async () => {
    const explainer: Explainer = {
      name: 'gemma',
      async explain() {
        return { status: 'unavailable', text: null };
      },
      async chat() {
        return { status: 'ok', text: 'Gumamit ng Karate 2 ml kada litro.' };
      },
    };
    const res = await answerQuestion(
      { uid: 'u3', crop: 'any', text: 'ano ang pwede i-spray' },
      { matcher: matcher({ ids: [], clear: false }), explainer, knowledge, logger: { write() {} } },
    );
    expect(res.explanationStatus).toBe('blocked');
    expect(res.explanation).toBeNull();
  });

  it('matches on the crop named earlier in the chat', async () => {
    const crops: string[] = [];
    const spy: Matcher = { name: 'hybrid', async match(_text, crop) { crops.push(crop); return { ids: [], clear: false }; } };
    const deps = { matcher: spy, explainer: recorder(), knowledge, logger: { write() {} } };
    const history = [{ question: 'may mali sa palay ko', reply: 'Ano ang nakikita mo?' }];
    await answerQuestion({ uid: 'u4', crop: 'any', text: 'may butas po', history }, deps);
    await answerQuestion({ uid: 'u5', crop: 'any', text: 'may butas po' }, deps);
    await answerQuestion({ uid: 'u6', crop: 'corn', text: 'may butas po', history }, deps);
    expect(crops).toEqual(['rice', 'any', 'corn']);
  });

  it('skips the explainer when the matched ids are not in the knowledge base', async () => {
    const { calls } = await run({ ids: ['no-such-problem'], clear: true });
    expect(calls).toHaveLength(0);
  });
});

describe('parseAskRequest history', () => {
  const base = { uid: 'u1', crop: 'rice', text: 'hello' };

  it('accepts no history and keeps the last thirty turns, so the whole chat reaches the hub', () => {
    expect(parseAskRequest(base)).toEqual(base);
    const history = Array.from({ length: 35 }, (_, i) => ({ question: `q${i}`, reply: `r${i}` }));
    const parsed = parseAskRequest({ ...base, history });
    expect(typeof parsed).toBe('object');
    expect((parsed as { history: unknown[] }).history).toEqual(history.slice(-30));
  });

  it('rejects history that is not a list of question and reply strings', () => {
    for (const history of ['hi', [{ question: 'q' }], [null], [{ question: 'q', reply: 'r'.repeat(2001) }]]) {
      expect(typeof parseAskRequest({ ...base, history })).toBe('string');
    }
  });
});
