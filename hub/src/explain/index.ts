import type { ChatTurn, Crop, KnowledgeEntry } from '@ugatan/shared';

export interface ExplainInput {
  text: string;
  crop: Crop | 'any';
  /** Notes the matcher chose. The explainer may use only these. */
  entries: readonly KnowledgeEntry[];
  /** The matcher's verdict. False when it is not sure, so the entries are only candidates. */
  clear: boolean;
  /** Set after two questions in a row with no clear match. The reply then gives its best guess and asks nothing. */
  bestGuess?: boolean;
}

export interface ExplainResult {
  status: 'ok' | 'unavailable';
  /** Taglish explanation. Null when unavailable. The hub checks it against the pesticide guardrail before sending. */
  text: string | null;
}

export interface ChatInput {
  /** What the farmer just said. */
  text: string;
  /** Earlier turns of the chat, oldest first. */
  history: readonly ChatTurn[];
  /** The farmer's earlier symptom messages, so the reply never asks again for what they already said. */
  notes?: readonly string[];
  /** Set when the farmer described signs and nothing matched. Small talk and questions leave it unset. */
  unmatched?: boolean;
  /** Set with `unmatched` after two questions in a row with no clear match. The reply then asks nothing and says what is uncertain. */
  final?: boolean;
  /** The crop the chat names, if any. The reply talks only about that crop. */
  crop?: Crop | 'any';
  /** The problem the app last named in this chat. Questions about it are answered from its notes. */
  diagnosis?: KnowledgeEntry;
}

/**
 * Writes the Taglish explanation for the notes the matcher chose. It explains; it does not diagnose. The Gemma
 * routes implement it (gemma-llamacpp.ts, gemma.ts).
 */
export interface Explainer {
  readonly name: string;
  explain(input: ExplainInput): Promise<ExplainResult>;
  /**
   * Replies to what the farmer said when nothing matched: a greeting, a complaint, or a report with no sign.
   * It asks what the farmer sees and never names a problem. Optional; without it the phone shows its no-match line.
   */
  chat?(input: ChatInput): Promise<ExplainResult>;
}

/**
 * Puts a farmer's question into plain English signs before matching, so keyword matching and Laya can read
 * Tagalog, Taglish, Cebuano (Bisaya), and English. It translates; it does not diagnose. The llama.cpp Gemma
 * route implements it. Returns NO_SIGNS when the farmer named no sign, OTHER_CROP when the plant is not rice or
 * corn, and null when it has nothing useful.
 */
export interface Describer {
  describe(text: string, crop: Crop | 'any'): Promise<string | null>;
}

/**
 * Reads a photo of the plant and writes down the signs it shows, in plain English, for the matcher. It describes
 * and does not diagnose. The vision route implements it (vision.ts).
 */
export interface ImageDescriber {
  readonly name: string;
  /**
   * JPEG bytes in, the model's raw answer out. `note` is what the farmer typed with the photo. Pass the answer to
   * `photoOutcome` in shared. Null when the model returned nothing.
   */
  describeImage(image: Uint8Array, note: string, crop: Crop | 'any'): Promise<string | null>;
}

/**
 * Writes down what a farmer said in a recording, so they can speak instead of type. The multimodal route
 * implements it (multimodal.ts). The text only fills the question box; the farmer checks it before sending.
 */
export interface AudioTranscriber {
  readonly name: string;
  /** 16 kHz mono samples in, the model's raw answer out. Pass the answer to `transcriptText` in shared. Null when the model returned nothing. */
  transcribe(samples: Float32Array): Promise<string | null>;
}

/** No explainer. Answers carry the matched notes and no AI text. */
export const offExplainer: Explainer = {
  name: 'off',
  async explain() {
    return { status: 'unavailable', text: null };
  },
};
