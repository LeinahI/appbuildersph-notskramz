import Dexie, { type EntityTable } from 'dexie';
import type { ChatTurn, Crop } from '@ugatan/shared';

/** A question waiting for the hub, or already answered. Stored on the phone only. */
export interface QueuedQuestion {
  id?: number;
  /** Sent to the hub as the request id. */
  uid: string;
  crop: Crop | 'any';
  text: string;
  /** Earlier turns of the chat at the time of asking, so the hub can reply in context. */
  history?: ChatTurn[];
  /** Set when the farmer tapped a symptom picture instead of typing. */
  symptomId?: string;
  /** The chat this question belongs to. The hub keeps the chat's notes under it. */
  sessionId?: string;
  /** Whether the question went to matching ("match") or to the chat, for small talk ("chat"). */
  route?: 'match' | 'chat';
  createdAt: string;
  status: 'queued' | 'answered';
  /** Local keyword result at the time of asking, on the whole chat so far. */
  matchIds: string[];
  clear: boolean;
  /** The symptom words the local match was found on. */
  matchedOn?: string[];
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  matcher?: 'keyword' | 'laya' | 'hybrid';
  /** The hub's match, once it answered. The hub's explanation is about these notes, so the app shows them. */
  hubMatchIds?: string[];
  hubClear?: boolean;
  hubMatchedOn?: string[];
  answeredAt?: string;
  lastError?: string;
}

class UgatanDb extends Dexie {
  questions!: EntityTable<QueuedQuestion, 'id'>;

  constructor() {
    super('ugatan');
    this.version(1).stores({
      questions: '++id, uid, status, createdAt',
    });
  }
}

export const db = new UgatanDb();

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
