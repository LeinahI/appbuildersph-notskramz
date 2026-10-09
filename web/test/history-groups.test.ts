import { describe, expect, it } from 'vitest';
import type { QueuedQuestion } from '../src/lib/db';
import { filterHistory, groupHistory } from '../src/lib/history-groups';

const q = (uid: string, text: string, createdAt: string): QueuedQuestion => ({
  uid, text, createdAt, crop: 'any', status: 'queued', matchIds: [], clear: false,
});

describe('history groups', () => {
  const now = new Date(2026, 9, 10, 15, 0);
  const items = [
    q('old', 'lumang tanong', new Date(2026, 9, 1, 9, 0).toISOString()),
    q('today-early', 'umaga', new Date(2026, 9, 10, 8, 0).toISOString()),
    q('yday', 'kahapon', new Date(2026, 9, 9, 23, 30).toISOString()),
    q('today-late', 'hapon', new Date(2026, 9, 10, 14, 0).toISOString()),
  ];

  it('groups by calendar day, newest first, skipping empty groups', () => {
    const groups = groupHistory(items, now);
    expect(groups.map((g) => g.key)).toEqual(['today', 'yesterday', 'earlier']);
    expect(groups[0]!.items.map((i) => i.uid)).toEqual(['today-late', 'today-early']);
    expect(groupHistory([items[0]!], now).map((g) => g.key)).toEqual(['earlier']);
    expect(groupHistory([], now)).toEqual([]);
  });

  it('filters by text, ignoring case and surrounding spaces', () => {
    expect(filterHistory(items, '  UMAGA ').map((i) => i.uid)).toEqual(['today-early']);
    expect(filterHistory(items, '')).toBe(items);
    expect(filterHistory(items, 'wala')).toEqual([]);
  });
});
