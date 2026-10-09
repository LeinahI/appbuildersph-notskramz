import type { Matcher } from './index.js';

/**
 * Keyword first, Laya for the rest. A clear keyword answer is final: it is offline, explainable, and has
 * the better record on the labeled set. Only when keyword is not sure does Laya get a say, and only a
 * clear Laya answer replaces it. If neither is sure the answer is "not sure", with keyword's candidates
 * when it had any. A Laya error at question time falls back to the keyword answer.
 */
export function createHybridMatcher(keyword: Matcher, laya: Matcher): Matcher {
  return {
    name: 'hybrid',
    async match(text, crop) {
      const first = await keyword.match(text, crop);
      if (first.clear) return first;

      let second;
      try {
        second = await laya.match(text, crop);
      } catch {
        return first;
      }
      if (second.clear) return second;
      return { ids: first.ids.length > 0 ? first.ids : second.ids, clear: false };
    },
  };
}
