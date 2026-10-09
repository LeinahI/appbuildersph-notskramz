import { matchKeywords, type KnowledgeEntry } from '@ugatan/shared';
import type { Matcher } from './index.js';

export interface KeywordMatcherOptions {
  /**
   * Distinct keywords the top problem needs for a clear answer. 1 for the farmer's own words. The hybrid
   * matcher asks 2 of Gemma's English, so one word Gemma got wrong cannot decide the answer.
   */
  minScore?: number;
}

/** Offline keyword matching. Always available. The fallback when Laya is off or fails. */
export function createKeywordMatcher(entries: readonly KnowledgeEntry[], { minScore = 1 }: KeywordMatcherOptions = {}): Matcher {
  return {
    name: 'keyword',
    async match(text, crop) {
      const result = matchKeywords(text, crop, entries, 2);
      const top = result.matches[0]?.score ?? 0;
      return { ids: result.matches.map((m) => m.entry.id), clear: result.clear && top >= minScore };
    },
  };
}
