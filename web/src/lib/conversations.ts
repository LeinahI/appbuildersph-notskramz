import { db, newId, type ConversationRow, type QueuedQuestion } from './db';
import {
  createConversationRemote,
  deleteConversationRemote,
  listConversationsRemote,
  patchConversationRemote,
  putConversationMessages,
  type ConversationDTO,
  type MessageInput,
} from './ws-api';
import { clearClaimLink, loadClaimLink } from '../config/ws';

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

export async function ensureActiveConversation(): Promise<ConversationRow> {
  const activeId = loadActiveConversationId();
  if (activeId) {
    const existing = await db.conversations.get(activeId);
    if (existing) return existing;
  }
  const all = await listLocalConversations();
  if (all[0]) {
    saveActiveConversationId(all[0].id);
    return all[0];
  }
  return createLocalConversation('Bagong usapan');
}

/** Deep-link path for a conversation, or bare `/chat` when no id is known. */
export function chatHref(id?: string): string {
  const resolved = id ?? loadActiveConversationId();
  return resolved ? `/chat/${resolved}` : '/chat';
}

/** Load by URL id when present; otherwise last-active / latest / create. */
export async function resolveConversation(id: string | undefined): Promise<ConversationRow> {
  if (id) {
    const existing = await db.conversations.get(id);
    if (existing) {
      saveActiveConversationId(existing.id);
      return existing;
    }
  }
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
  saveActiveConversationId(row.id);
  void syncCreate(row);
  return row;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  await db.conversations.update(id, { title: trimmed, updatedAt: new Date().toISOString() });
  const row = await db.conversations.get(id);
  if (row?.remoteId) {
    void patchConversationRemote(row.remoteId, { title: trimmed }).catch(onAuthError);
  }
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  await db.conversations.update(id, { pinned, updatedAt: new Date().toISOString() });
  const row = await db.conversations.get(id);
  if (row?.remoteId) {
    void patchConversationRemote(row.remoteId, { pinned }).catch(onAuthError);
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const row = await db.conversations.get(id);
  await db.transaction('rw', db.conversations, db.questions, async () => {
    await db.questions.where('conversationId').equals(id).delete();
    await db.conversations.delete(id);
  });
  if (loadActiveConversationId() === id) {
    saveActiveConversationId('');
  }
  if (row?.remoteId) {
    void deleteConversationRemote(row.remoteId).catch(onAuthError);
  }
}

export async function questionsForConversation(conversationId: string): Promise<QueuedQuestion[]> {
  return db.questions.where('conversationId').equals(conversationId).sortBy('id');
}

/** Persist the full thread to ws (fire-and-forget). */
export async function saveConversationThread(conversationId: string): Promise<void> {
  const claim = loadClaimLink();
  if (!claim) return;
  const conv = await db.conversations.get(conversationId);
  if (!conv) return;
  let remoteId = conv.remoteId;
  if (!remoteId) {
    try {
      const created = await createConversationRemote(conv.title);
      remoteId = created.id;
      await db.conversations.update(conv.id, { remoteId });
    } catch (err) {
      onAuthError(err);
      return;
    }
  }
  const qs = await questionsForConversation(conversationId);
  const messages: MessageInput[] = [];
  for (const q of qs) {
    messages.push({ role: 'user', body: q.text, clientUid: `${q.uid}-q` });
    const reply = q.explanation?.trim();
    if (reply) {
      messages.push({
        role: 'assistant',
        body: reply,
        clientUid: `${q.uid}-a`,
        meta: {
          matchIds: q.hubMatchIds ?? q.matchIds,
          clear: q.hubClear ?? q.clear,
          route: q.route,
        },
      });
    }
  }
  try {
    await putConversationMessages(remoteId, messages);
    await db.conversations.update(conversationId, { updatedAt: new Date().toISOString() });
  } catch (err) {
    onAuthError(err);
  }
}

async function syncCreate(row: ConversationRow): Promise<void> {
  if (!loadClaimLink()) return;
  try {
    const created = await createConversationRemote(row.title);
    await db.conversations.update(row.id, { remoteId: created.id });
  } catch (err) {
    onAuthError(err);
  }
}

/** Pull remote list and merge titles/pins (local messages stay authoritative until next save). */
export async function pullRemoteConversations(): Promise<void> {
  if (!loadClaimLink()) return;
  let remote: ConversationDTO[];
  try {
    remote = await listConversationsRemote();
  } catch (err) {
    onAuthError(err);
    return;
  }
  const local = await db.conversations.toArray();
  const byRemote = new Map(local.filter((l) => l.remoteId).map((l) => [l.remoteId!, l]));
  for (const r of remote) {
    const existing = byRemote.get(r.id);
    if (existing) {
      await db.conversations.update(existing.id, {
        title: r.title,
        pinned: r.pinned,
        updatedAt: r.updatedAt,
      });
    } else {
      const now = new Date().toISOString();
      await db.conversations.add({
        id: crypto.randomUUID(),
        remoteId: r.id,
        title: r.title,
        pinned: r.pinned,
        sessionId: newId(),
        updatedAt: r.updatedAt || now,
        createdAt: r.createdAt || now,
      });
    }
  }
}

function onAuthError(err: unknown): void {
  if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 401) {
    clearClaimLink();
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  }
}
