import Dexie, { type EntityTable } from 'dexie';
import type { ChatTurn, Crop, PhotoStatus } from '@ugatan/shared';

/** A question waiting for the hub, or already answered. Stored on the phone. */
export interface QueuedQuestion {
  id?: number;
  uid: string;
  crop: Crop | 'any';
  text: string;
  history?: ChatTurn[];
  symptomId?: string;
  /** A photo of the plant, shrunk to a base64 JPEG. Only the hub reads it, so the question waits for the hub. */
  image?: string;
  /** How the hub read the photo, once it answered. */
  photo?: PhotoStatus;
  /** What the hub saw in the photo, in plain English. */
  photoSigns?: string | null;
  sessionId?: string;
  conversationId?: string;
  route?: 'match' | 'chat';
  createdAt: string;
  status: 'queued' | 'answered';
  matchIds: string[];
  clear: boolean;
  matchedOn?: string[];
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  matcher?: 'keyword' | 'laya' | 'hybrid';
  hubMatchIds?: string[];
  hubClear?: boolean;
  hubMatchedOn?: string[];
  answeredAt?: string;
  lastError?: string;
}

export interface ConversationRow {
  id: string;
  remoteId?: string;
  title: string;
  pinned: boolean;
  sessionId: string;
  updatedAt: string;
  createdAt: string;
}

class UgatanDb extends Dexie {
  questions!: EntityTable<QueuedQuestion, 'id'>;
  conversations!: EntityTable<ConversationRow, 'id'>;

  constructor() {
    super('ugatan');
    this.version(1).stores({
      questions: '++id, uid, status, createdAt',
    });
    this.version(2)
      .stores({
        questions: '++id, uid, status, createdAt, sessionId, conversationId',
        conversations: 'id, remoteId, updatedAt, pinned, sessionId',
      })
      .upgrade(async (tx) => {
        const questions = tx.table('questions');
        const conversations = tx.table('conversations');
        const rows = await questions.toArray();
        if (rows.length === 0) return;
        const sessionId =
          (rows.find((r) => r.sessionId)?.sessionId as string | undefined) ??
          `${Date.now().toString(36)}-migrated`;
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await conversations.add({
          id,
          title: 'Dating usapan',
          pinned: false,
          sessionId,
          updatedAt: now,
          createdAt: now,
        });
        for (const row of rows) {
          await questions.update(row.id!, {
            sessionId: row.sessionId ?? sessionId,
            conversationId: id,
          });
        }
      });
  }
}

export const db = new UgatanDb();

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
