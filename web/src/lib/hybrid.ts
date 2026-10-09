import { NO_SIGNS, OTHER_CROP, matchKeywords, type Crop, type KnowledgeEntry } from '@ugatan/shared';
import type { LayaOutcome } from './laya';

/** What the phone's matcher decided. The same shape as the hub's MatchOutcome. */
export interface MatchOutcome {
  ids: string[];
  clear: boolean;
  /** Gemma's plain-English description, when it was used. */
  english?: string;
  /** The farmer named no sign, or another crop: nothing is matched, and the chat replies. */
  noSigns?: boolean;
  /** The keywords a keyword match was found on. */
  matchedOn: string[];
}

export interface HybridDeps {
  knowledge: readonly KnowledgeEntry[];
  /** Gemma's describe step (NO_SIGNS, OTHER_CROP, the English, or null). Without it, Laya reads the farmer's words. */
  describe?: (text: string, crop: Crop | 'any') => Promise<string | null>;
  /** Laya. Without it, keyword alone decides. */
  laya?: (text: string, crop: Crop | 'any') => Promise<LayaOutcome>;
}

function keyword(text: string, crop: Crop | 'any', knowledge: readonly KnowledgeEntry[], minScore: number): MatchOutcome {
  const result = matchKeywords(text, crop, knowledge);
  const top = result.matches[0]?.score ?? 0;
  return {
    ids: result.matches.map((m) => m.entry.id),
    clear: result.clear && top >= minScore,
    matchedOn: result.matches[0]?.hits ?? [],
  };
}

/**
 * The hub's hybrid matcher (hub/src/matchers/hybrid.ts), on the phone. Keyword first: a clear keyword answer is
 * final. Otherwise Gemma puts the words into plain English; keyword needs two distinct keywords on that English, and
 * Laya may only pick a problem keyword also found. Anything else is "not sure", with keyword's candidates first.
 * A describe or Laya error falls back to the answer without it.
 */
export async function matchOnPhone(text: string, crop: Crop | 'any', deps: HybridDeps): Promise<MatchOutcome> {
  const first = keyword(text, crop, deps.knowledge, 1);
  if (first.clear || (!deps.describe && !deps.laya)) return first;

  let english: string | null = null;
  if (deps.describe) {
    try {
      english = await deps.describe(text, crop);
    } catch {
      english = null;
    }
  }
  if (english === NO_SIGNS || english === OTHER_CROP) return { ids: [], clear: false, noSigns: true, matchedOn: [] };
  const withEnglish = (o: MatchOutcome): MatchOutcome => (english ? { ...o, english } : o);

  let fromEnglish: MatchOutcome | null = null;
  if (english) {
    fromEnglish = keyword(english, crop, deps.knowledge, 2);
    if (fromEnglish.clear) return withEnglish(fromEnglish);
  }

  let second: LayaOutcome = { ids: [], clear: false };
  if (deps.laya) {
    try {
      second = await deps.laya(english ?? text, crop);
    } catch {
      // Laya failed on this question. Answer from keyword's candidates below.
    }
  }
  // On Gemma's English, Laya only ranks what keyword found: Laya is confident even on "no signs given".
  const supported = !english || [...first.ids, ...(fromEnglish?.ids ?? [])].includes(second.ids[0] ?? '');
  if (second.clear && supported) return withEnglish({ ...second, matchedOn: [] });
  const candidates = [first.ids, fromEnglish?.ids ?? [], second.ids].find((ids) => ids.length > 0) ?? [];
  return withEnglish({ ids: candidates, clear: false, matchedOn: first.matchedOn });
}
