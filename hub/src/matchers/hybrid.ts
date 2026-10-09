import { NO_SIGNS, OTHER_CROP, type Crop } from '@ugatan/shared';
import type { MatchOutcome, Matcher } from './index.js';

/**
 * Puts the farmer's words into plain English signs (Gemma, see Describer in explain/index.ts). Returns NO_SIGNS
 * when the farmer named no sign, OTHER_CROP when the plant is not rice or corn, and null when it has nothing useful.
 */
export type Describe = (text: string, crop: Crop | 'any') => Promise<string | null>;

/**
 * Keyword first, Laya for the rest. A clear keyword answer is final: it is offline, explainable, and has
 * the better record on the labeled set. Only when keyword is not sure does Laya get a say, and only a
 * clear Laya answer replaces it. If neither is sure the answer is "not sure", with keyword's candidates
 * when it had any. A Laya error at question time falls back to the keyword answer.
 *
 * With describe (Gemma), a question keyword is not sure of is first put into plain English, then keyword
 * and Laya match that English. This is what lets the hub read Tagalog, Taglish, Cebuano (Bisaya), and
 * reworded English: keyword knows a fixed list of words and Laya reads English only. Gemma only translates;
 * keyword and Laya still decide. On the English, keyword needs two distinct keywords for a clear answer, and
 * Laya may only pick among keyword's candidates. A describe error falls back to matching the farmer's own words.
 */
export interface HybridOptions {
  /** Gemma's plain-English description of the question. Without it, keyword and Laya read the farmer's words. */
  describe?: Describe;
  /** Keyword matcher for Gemma's English, stricter than the one for the farmer's words (minScore 2). Defaults to keyword. */
  englishKeyword?: Matcher;
}

export function createHybridMatcher(keyword: Matcher, laya: Matcher, { describe, englishKeyword = keyword }: HybridOptions = {}): Matcher {
  return {
    name: 'hybrid',
    async match(text, crop) {
      const first = await keyword.match(text, crop);
      if (first.clear) return first;

      let english: string | null = null;
      if (describe) {
        try {
          english = await describe(text, crop);
        } catch {
          english = null;
        }
      }
      // A greeting, a complaint, "may problema ang palay ko", or kangkong. Laya would still pick a rice or corn
      // problem for these words, so nothing is matched. The hub answers what the farmer said instead (Explainer.chat).
      if (english === NO_SIGNS || english === OTHER_CROP) return { ids: [], clear: false, noSigns: true };
      const withEnglish = (o: MatchOutcome): MatchOutcome => (english ? { ...o, english } : o);

      let fromEnglish: MatchOutcome | null = null;
      if (english) {
        fromEnglish = await englishKeyword.match(english, crop);
        if (fromEnglish.clear) return withEnglish(fromEnglish);
      }

      let second: MatchOutcome = { ids: [], clear: false };
      try {
        second = await laya.match(english ?? text, crop);
      } catch {
        // Laya failed on this question. Answer from keyword's candidates below.
      }
      // On Gemma's English, Laya only ranks what keyword found. Laya is confident even on "no signs given",
      // so a Laya pick that no keyword supports is "not sure", never a clear answer.
      const supported = !english || [...first.ids, ...(fromEnglish?.ids ?? [])].includes(second.ids[0] ?? '');
      if (second.clear && supported) return withEnglish(second);
      const candidates = [first.ids, fromEnglish?.ids ?? [], second.ids].find((ids) => ids.length > 0) ?? [];
      return withEnglish({ ids: candidates, clear: false });
    },
  };
}
