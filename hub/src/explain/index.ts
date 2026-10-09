import type { Crop, KnowledgeEntry } from '@ugatan/shared';

export interface ExplainInput {
  text: string;
  crop: Crop | 'any';
  /** Notes the matcher chose. The explainer may use only these. */
  entries: readonly KnowledgeEntry[];
  /** The matcher's verdict. False when it is not sure, so the entries are only candidates. */
  clear: boolean;
}

export interface ExplainResult {
  status: 'ok' | 'unavailable';
  /** Taglish explanation. Null when unavailable. The hub checks it against the pesticide guardrail before sending. */
  text: string | null;
}

/**
 * Writes the Taglish explanation for the notes the matcher chose. It explains; it does not diagnose. The Gemma
 * routes implement it (gemma-llamacpp.ts, gemma.ts).
 */
export interface Explainer {
  readonly name: string;
  explain(input: ExplainInput): Promise<ExplainResult>;
}

/**
 * Puts a farmer's question into plain English signs before matching, so keyword matching and Laya can read
 * Tagalog, Taglish, Cebuano (Bisaya), and English. It translates; it does not diagnose. The llama.cpp Gemma
 * route implements it. Returns null when it has nothing useful.
 */
export interface Describer {
  describe(text: string, crop: Crop | 'any'): Promise<string | null>;
}

/** No explainer. Answers carry the matched notes and no AI text. */
export const offExplainer: Explainer = {
  name: 'off',
  async explain() {
    return { status: 'unavailable', text: null };
  },
};
