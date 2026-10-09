import { describe, expect, it } from 'vitest';
import { formatChatDate, highlightSegments, snippetAround } from '../src/lib/search-chats';

describe('highlightSegments', () => {
  it('marks case-insensitive matches', () => {
    expect(highlightSegments('LLM Prompt and llm tools', 'llm')).toEqual([
      { text: 'LLM', hit: true },
      { text: ' Prompt and ', hit: false },
      { text: 'llm', hit: true },
      { text: ' tools', hit: false },
    ]);
  });

  it('returns plain text when needle is empty', () => {
    expect(highlightSegments('hello', '')).toEqual([{ text: 'hello', hit: false }]);
  });
});

describe('snippetAround', () => {
  it('clips around the first match', () => {
    const long = `${'a'.repeat(80)}keyword${'b'.repeat(80)}`;
    const snip = snippetAround(long, 'keyword', 10);
    expect(snip).toContain('keyword');
    expect(snip.startsWith('…')).toBe(true);
    expect(snip.endsWith('…')).toBe(true);
  });
});

describe('formatChatDate', () => {
  it('labels today in Tagalog', () => {
    expect(formatChatDate(new Date().toISOString(), 'tl-PH')).toBe('Ngayon');
  });
});
