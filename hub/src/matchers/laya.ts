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

/** Problem name without the parenthetical or alias: "Brown planthopper (BPH) / hopperburn" becomes "Brown planthopper". */
function shortName(name: string): string {
  return name.replace(/\s*\(.*?\)/g, '').replace(/\s*\/.*$/, '').trim();
}

/**
 * One option per knowledge entry, as plain text: the short name, then the signs.
 * Do not put the id in the text. Laya fits all options of a question into 192 tokens and, when they
 * do not fit, silently cuts every option to an equal share (22 tokens for 8 options). An id prefix
 * used most of that share and the signs were cut off, so the model only saw names.
 * Exported so the tests build the same options.
 */
export function problemOptions(entries: readonly KnowledgeEntry[]): { ids: string[]; texts: string[] } {
  return {
    ids: entries.map((e) => e.id),
    texts: entries.map((e) => `${shortName(e.name)}: ${e.signs.join('; ')}`),
  };
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

      const { ids: poolIds, texts } = problemOptions(pool);
      const result = await laya.systemOne(
        { description: text },
        { problem: { type: 'choice', instructions: LAYA_INSTRUCTIONS, criteria: texts } },
      );

      // With an array of options, Laya names each option by its text. Map back to the problem id.
      const answer = result.answers.problem as ChoiceAnswer;
      const ranked = Object.entries(answer.probabilities)
        .sort((a, b) => b[1] - a[1])
        .map(([text]) => poolIds[texts.indexOf(text)])
        .filter((id): id is string => id !== undefined);
      return {
        ids: ranked.slice(0, 2),
        clear: answer.confidence >= opts.confidenceThreshold,
      };
    },
  };
}
