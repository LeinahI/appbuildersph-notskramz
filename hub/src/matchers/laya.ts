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
  /**
   * Where the model runs. webgpu is about 10 times faster on the dev laptop (about 0.1 s against 1 s per
   * question) and falls back to cpu if it fails to load or to answer. Confidences can differ from cpu in
   * the fourth decimal. Defaults to cpu.
   */
  device?: 'webgpu' | 'cpu';
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
  const load = async (device: 'webgpu' | 'cpu'): Promise<Laya> => {
    const laya = await Laya.load({
      cacheDir: opts.cacheDir,
      ...(opts.modelDir ? { modelDir: opts.modelDir } : {}),
      executionProviders: [device],
      // Hides onnxruntime's notice that shape ops stay on the CPU. Errors still show.
      sessionOptions: { logSeverityLevel: 3 },
    });
    // Warm-up. The first question is several times slower, and a GPU that loads can still fail here
    // (DirectML loads this model, then fails on its first answer).
    try {
      await ask(laya, entries, 'Dilaw ang dahon');
    } catch (err) {
      await laya.close();
      throw err;
    }
    return laya;
  };

  let laya: Laya;
  if ((opts.device ?? 'cpu') === 'webgpu') {
    try {
      laya = await load('webgpu');
    } catch (err) {
      console.warn(`Laya could not use the GPU (WebGPU), using the CPU: ${err instanceof Error ? err.message : String(err)}`);
      laya = await load('cpu');
    }
  } else {
    laya = await load('cpu');
  }

  return {
    name: 'laya',
    async match(text, crop) {
      const pool = entries.filter((e) => crop === 'any' || e.crop === crop);
      if (pool.length === 0) return { ids: [], clear: false };

      const { ids, confidence } = await ask(laya, pool, text);
      return {
        ids: ids.slice(0, 2),
        clear: confidence >= opts.confidenceThreshold,
      };
    },
  };
}

/** One choice question with one option per entry. Returns the ids ranked by probability, and Laya's confidence. */
async function ask(laya: Laya, pool: readonly KnowledgeEntry[], text: string): Promise<{ ids: string[]; confidence: number }> {
  const { ids: poolIds, texts } = problemOptions(pool);
  const result = await laya.systemOne(
    { description: text },
    { problem: { type: 'choice', instructions: LAYA_INSTRUCTIONS, criteria: texts } },
  );

  // With an array of options, Laya names each option by its text. Map back to the problem id.
  const answer = result.answers.problem as ChoiceAnswer;
  const ids = Object.entries(answer.probabilities)
    .sort((a, b) => b[1] - a[1])
    .map(([optionText]) => poolIds[texts.indexOf(optionText)])
    .filter((id): id is string => id !== undefined);
  return { ids, confidence: answer.confidence };
}
