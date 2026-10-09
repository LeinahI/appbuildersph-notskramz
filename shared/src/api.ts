import type { Crop } from './types.js';

/** One earlier exchange in the same chat, so the model can answer what the farmer is saying now. */
export interface ChatTurn {
  question: string;
  /** What the app showed as the reply. */
  reply: string;
}

/**
 * How many earlier turns the hub accepts from the phone. The hub keeps the farmer's symptom notes for the whole
 * chat, and only the last few turns go into the model's prompt.
 */
export const MAX_HISTORY_TURNS = 30;

/** POST /ask on the village hub. Body. */
export interface AskRequest {
  /** Client-generated id. Lets the phone match the answer to its queued question. */
  uid: string;
  crop: Crop | 'any';
  /** Farmer's description, in Tagalog, Taglish, or English. */
  text: string;
  /** Earlier turns of this chat, oldest first. Optional. The hub reads the farmer's notes from them when it has no record of the chat. */
  history?: ChatTurn[];
  /** Id of this chat (one per "Bagong usapan"). The hub keeps the chat's notes under it, so every reply reads the whole chat. */
  sessionId?: string;
}

/** POST /ask on the village hub. Response. The phone shows its own curated notes plus this explanation. */
export interface AskResponse {
  uid: string;
  /** Which matcher ran on the hub. */
  matcher: 'keyword' | 'laya' | 'hybrid';
  /** Knowledge ids the hub matched, best first. Empty for small talk and when nothing matched. */
  matchIds: string[];
  /** False when the hub is not sure. */
  clear: boolean;
  /** The symptom words the top match was found on, so the app can say why it matched. Empty when none were found. */
  matchedOn: string[];
  /** "ok": explanation generated. "blocked": guardrail dropped it. "unavailable": no explainer on this hub. */
  explanationStatus: 'ok' | 'blocked' | 'unavailable';
  /**
   * Taglish explanation of the matched notes. With no match, Gemma's reply to what the farmer said instead.
   * Null when not available. Already guarded on the hub.
   */
  explanation: string | null;
}
