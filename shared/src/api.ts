import type { Crop } from './types.js';

/** POST /ask on the village hub. Body. */
export interface AskRequest {
  /** Client-generated id. Lets the phone match the answer to its queued question. */
  uid: string;
  crop: Crop | 'any';
  /** Farmer's description, in Tagalog, Taglish, or English. */
  text: string;
}

/** POST /ask on the village hub. Response. The phone shows its own curated notes plus this explanation. */
export interface AskResponse {
  uid: string;
  /** Which matcher ran on the hub. */
  matcher: 'keyword' | 'laya' | 'hybrid';
  /** Knowledge ids the hub matched, best first. */
  matchIds: string[];
  /** False when the hub is not sure. */
  clear: boolean;
  /** "ok": explanation generated. "blocked": guardrail dropped it. "unavailable": no explainer on this hub. */
  explanationStatus: 'ok' | 'blocked' | 'unavailable';
  /** Taglish explanation, or null when not available. Already guarded on the hub. */
  explanation: string | null;
}
