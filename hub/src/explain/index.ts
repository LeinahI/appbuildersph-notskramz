import type { Crop, KnowledgeEntry } from '@ugatan/shared';

export interface ExplainInput {
  text: string;
  crop: Crop | 'any';
  /** Matched notes. The explainer may use only these. */
  entries: readonly KnowledgeEntry[];
}

export interface ExplainResult {
  status: 'ok' | 'unavailable';
  /** Taglish explanation. Null when unavailable. The hub checks it against the pesticide guardrail before sending. */
  text: string | null;
}

/** Writes the Taglish explanation for matched notes. The Gemma E4B route implements it once decided. */
export interface Explainer {
  readonly name: string;
  explain(input: ExplainInput): Promise<ExplainResult>;
}

/** No explainer. Answers carry the matched notes and no AI text. */
export const offExplainer: Explainer = {
  name: 'off',
  async explain() {
    return { status: 'unavailable', text: null };
  },
};
