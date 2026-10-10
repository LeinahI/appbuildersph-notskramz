import { db, newId, type ConversationRow, type QueuedQuestion } from './db';

/**
 * Farmer chats are device-local only (Dexie/IndexedDB in this module's scope).
 * Small UI keys (active conversation id) use localStorage; full threads never leave the phone.
 * No farmer account or ws conversation sync.
 */

const ACTIVE_KEY = 'ugatan.activeConversationId';

export function loadActiveConversationId(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveActiveConversationId(id: string): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // private window
  }
}

function sortConversations(rows: ConversationRow[]): ConversationRow[] {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function listLocalConversations(q?: string): Promise<ConversationRow[]> {
  let rows = await db.conversations.toArray();
  const needle = q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((r) => r.title.toLowerCase().includes(needle));
  }
  return sortConversations(rows);
}

/** Last-active or latest local chat, or null when the farmer is on a draft (no row yet). */
export async function ensureActiveConversation(): Promise<ConversationRow | null> {
  const activeId = loadActiveConversationId();
  if (activeId) {
    const existing = await db.conversations.get(activeId);
    if (existing) return existing;
  }
  const all = await listLocalConversations();
  return all[0] ?? null;
}

/** Deep-link path for a conversation, or bare `/chat` when no id is known. */
export function chatHref(id?: string): string {
  const resolved = id ?? loadActiveConversationId();
  return resolved ? `/chat/${resolved}` : '/chat';
}

/** Load by URL id when present; bare `/chat` (no id) is always a draft — never auto-select. */
export async function resolveConversation(id: string | undefined): Promise<ConversationRow | null> {
  if (!id) return null;
  const existing = await db.conversations.get(id);
  if (existing) return existing;
  // Unknown deep-link id: fall back for delete-nav / stale URLs; bare `/chat` never reaches here.
  return ensureActiveConversation();
}

export async function createLocalConversation(title = 'Bagong usapan'): Promise<ConversationRow> {
  const now = new Date().toISOString();
  const row: ConversationRow = {
    id: crypto.randomUUID(),
    title,
    pinned: false,
    sessionId: newId(),
    updatedAt: now,
    createdAt: now,
  };
  await db.conversations.add(row);
  // The caller selects only after checking that this asynchronous work is still current.
  return row;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('A chat title is required');
  const changed = await db.conversations.update(id, { title: trimmed, updatedAt: new Date().toISOString() });
  if (!changed) throw new Error('Chat not found');
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const changed = await db.conversations.update(id, { pinned, updatedAt: new Date().toISOString() });
  if (!changed) throw new Error('Chat not found');
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction('rw', db.conversations, db.questions, async () => {
    if (!await db.conversations.get(id)) throw new Error('Chat not found');
    await db.questions.where('conversationId').equals(id).delete();
    await db.conversations.delete(id);
  });
  if (loadActiveConversationId() === id) {
    saveActiveConversationId('');
  }
}

export async function questionsForConversation(conversationId: string): Promise<QueuedQuestion[]> {
  return db.questions.where('conversationId').equals(conversationId).sortBy('id');
}
