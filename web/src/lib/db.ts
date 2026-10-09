import Dexie, { type EntityTable } from 'dexie';
import type { Crop } from '@ugatan/shared';

/** A question waiting for the hub, or already answered. Stored on the phone only. */
export interface QueuedQuestion {
  id?: number;
  /** Sent to the hub as the request id. */
  uid: string;
  crop: Crop | 'any';
  text: string;
  /** Set when the farmer tapped a symptom picture instead of typing. */
  symptomId?: string;
  createdAt: string;
  status: 'queued' | 'answered';
  /** Local keyword result at the time of asking. */
  matchIds: string[];
  clear: boolean;
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  matcher?: 'keyword' | 'laya' | 'hybrid';
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
