import type { QueuedQuestion } from './db';

export type HistoryGroupKey = 'today' | 'yesterday' | 'earlier';

export interface HistoryGroup {
  key: HistoryGroupKey;
  items: QueuedQuestion[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function groupOf(createdAt: string, now: Date): HistoryGroupKey {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(createdAt))) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return 'earlier';
}

/** Newest first, grouped into Today / Yesterday / Earlier. Empty groups are left out. */
export function groupHistory(items: QueuedQuestion[], now = new Date()): HistoryGroup[] {
  const sorted = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const groups: HistoryGroup[] = [];
  for (const item of sorted) {
    const key = groupOf(item.createdAt, now);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

/** Case-insensitive match on the question text. A blank query keeps everything. */
export function filterHistory(items: QueuedQuestion[], query: string): QueuedQuestion[] {
  const needle = query.trim().toLocaleLowerCase();
  return needle ? items.filter((item) => item.text.toLocaleLowerCase().includes(needle)) : items;
}
