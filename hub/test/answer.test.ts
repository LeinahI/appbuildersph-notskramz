import { describe, expect, it } from 'vitest';
import type { KnowledgeEntry } from '@ugatan/shared';
import { answerQuestion } from '../src/answer';
import type { ExplainInput, Explainer } from '../src/explain/index';
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

  it('skips the explainer when the matched ids are not in the knowledge base', async () => {
    const { calls } = await run({ ids: ['no-such-problem'], clear: true });
    expect(calls).toHaveLength(0);
  });
});
