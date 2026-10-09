import { matchKeywords, type KnowledgeEntry } from '@ugatan/shared';
import type { Matcher } from './index.js';

/** Offline keyword matching. Always available. The fallback when Laya is off or fails. */
export function createKeywordMatcher(entries: readonly KnowledgeEntry[]): Matcher {
  return {
    name: 'keyword',
    async match(text, crop) {
      const result = matchKeywords(text, crop, entries, 2);
      return { ids: result.matches.map((m) => m.entry.id), clear: result.clear };
    },
  };
}
