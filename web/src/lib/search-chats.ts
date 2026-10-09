import { listLocalConversations, questionsForConversation } from './conversations';
import type { ConversationRow } from './db';

export type ChatHitMatchIn = 'title' | 'question' | 'answer';

export type ChatSearchHit = {
  conversationId: string;
  /** Empty when the hit is title-only (open chat without scroll target). */
  messageUid: string;
  title: string;
  snippet: string;
  matchIn: ChatHitMatchIn;
  updatedAt: string;
};

export type HighlightSegment = { text: string; hit: boolean };

/** Split text into segments for keyword highlighting (case-insensitive). */
export function highlightSegments(text: string, needle: string): HighlightSegment[] {
  const n = needle.trim();
  if (!n || !text) return text ? [{ text, hit: false }] : [];
  const lower = text.toLowerCase();
  const find = n.toLowerCase();
  const out: HighlightSegment[] = [];
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(find, i);
    if (at === -1) {
      out.push({ text: text.slice(i), hit: false });
      break;
    }
    if (at > i) out.push({ text: text.slice(i, at), hit: false });
    out.push({ text: text.slice(at, at + find.length), hit: true });
    i = at + find.length;
  }
  return out;
}

/** Clip text around the first match for result snippets. */
export function snippetAround(text: string, needle: string, radius = 56): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const n = needle.trim().toLowerCase();
  if (!n) return trimmed.slice(0, radius * 2);
  const at = trimmed.toLowerCase().indexOf(n);
  if (at === -1) return trimmed.slice(0, radius * 2);
  const start = Math.max(0, at - radius);
  const end = Math.min(trimmed.length, at + n.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < trimmed.length ? '…' : '';
  return `${prefix}${trimmed.slice(start, end)}${suffix}`;
}

export function listRecentConversations(): Promise<ConversationRow[]> {
  return listLocalConversations();
}

/** Full-text style search over local titles + question/answer bodies. */
export async function searchChatHits(needle: string): Promise<ChatSearchHit[]> {
  const q = needle.trim().toLowerCase();
  if (!q) return [];
  const convs = await listLocalConversations();
  const hits: ChatSearchHit[] = [];
  for (const c of convs) {
    if (c.title.toLowerCase().includes(q)) {
      hits.push({
        conversationId: c.id,
        messageUid: '',
        title: c.title,
        snippet: snippetAround(c.title, needle),
        matchIn: 'title',
        updatedAt: c.updatedAt,
      });
    }
    const qs = await questionsForConversation(c.id);
    for (const row of qs) {
      if (row.text.toLowerCase().includes(q)) {
        hits.push({
          conversationId: c.id,
          messageUid: row.uid,
          title: c.title,
          snippet: snippetAround(row.text, needle),
          matchIn: 'question',
          updatedAt: row.createdAt || c.updatedAt,
        });
      }
      const answer = row.explanation?.trim() ?? '';
      if (answer && answer.toLowerCase().includes(q)) {
        hits.push({
          conversationId: c.id,
          messageUid: row.uid,
          title: c.title,
          snippet: snippetAround(answer, needle),
          matchIn: 'answer',
          updatedAt: row.answeredAt || row.createdAt || c.updatedAt,
        });
      }
    }
  }
  hits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return hits;
}

/** Short date label for search rows (locale-aware). */
export function formatChatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayMs = 86_400_000;
  const diff = Math.round((startToday.getTime() - startThat.getTime()) / dayMs);
  if (diff === 0) return locale.startsWith('en') ? 'Today' : 'Ngayon';
  if (diff === 1) return locale.startsWith('en') ? 'Yesterday' : 'Kahapon';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
