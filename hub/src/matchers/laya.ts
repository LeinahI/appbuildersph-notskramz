import { Laya, type ChoiceAnswer } from '@receptron/laya';
import type { KnowledgeEntry } from '@ugatan/shared';
import type { Matcher } from './index.js';

export interface LayaMatcherOptions {
  /** Weights cache. Laya downloads about 1.69 GB here on first use (English checkpoint). */
  cacheDir: string;
  /** Use a local bundle folder instead. Nothing is downloaded when set. */
  modelDir: string | null;
  /** Below this confidence the hub says "not sure". The team sets it from the labeled test. */
  confidenceThreshold: number;
}

/** The question Laya answers for each description. Exported so the tests ask the same question. */
export const LAYA_INSTRUCTIONS = "Which crop problem best matches the farmer's description of what they see in the field?";

/** One option per knowledge entry: the problem name and its signs. Exported so the tests build the same options. */
export function problemCriteria(entries: readonly KnowledgeEntry[]): Record<string, string> {
  return Object.fromEntries(entries.map((e) => [e.id, `${e.name}. Signs: ${e.signs.join('; ')}`]));
}

/**
 * Laya matching over the knowledge base. One choice question with one option per problem.
 * Laya has no abstain option: it always returns the top option, so the confidence gate is ours.
 */
export async function createLayaMatcher(entries: readonly KnowledgeEntry[], opts: LayaMatcherOptions): Promise<Matcher> {
  const laya = await Laya.load({
    cacheDir: opts.cacheDir,
    ...(opts.modelDir ? { modelDir: opts.modelDir } : {}),
  });

  return {
    name: 'laya',
    async match(text, crop) {
      const pool = entries.filter((e) => crop === 'any' || e.crop === crop);
      if (pool.length === 0) return { ids: [], clear: false };

      const result = await laya.systemOne(
        { description: text },
        {
          problem: {
            type: 'choice',
            instructions: LAYA_INSTRUCTIONS,
            criteria: problemCriteria(pool),
          },
        },
      );

      const answer = result.answers.problem as ChoiceAnswer;
      const ranked = Object.entries(answer.probabilities)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      return {
        ids: ranked.slice(0, 2),
        clear: answer.confidence >= opts.confidenceThreshold,
      };
    },
  };
}
