import type { Crop, KeywordMatch, KeywordResult, KnowledgeEntry } from './types.js';

/** Lowercase, strip accents, turn hyphens and punctuation into spaces, collapse spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The entry's keywords found in the padded, normalized text. One item per keyword the text contains. */
function found(entry: KnowledgeEntry, padded: string): string[] {
  return entry.keywords.filter((keyword) => {
    const phrase = normalize(keyword);
    return phrase !== '' && padded.includes(` ${phrase} `);
  });
}

/** What a name hit adds to the score. A farmer who names the insect has told us which one it is, so it counts double. */
const NAME_WEIGHT = 2;

/** The names that identify an insect: common, scientific, and local, without the notes in brackets. Empty for a disease. */
function insectNames(entry: KnowledgeEntry): string[] {
  const insect = entry.insect;
  if (!insect) return [];
  return [insect.commonName, insect.scientificName, ...insect.localNames]
    .flatMap((name) => name.replace(/\([^)]*\)/g, ' ').split(/[,;]/))
    .map((name) => name.trim().toLowerCase())
    .filter((name) => normalize(name).length >= 4);
}

interface Found {
  keywords: string[];
  /** The insect names the text contains, one per distinct name. */
  names: string[];
}

function foundIn(entry: KnowledgeEntry, padded: string): Found {
  const names = new Map<string, string>();
  for (const name of insectNames(entry)) {
    const phrase = normalize(name);
    // A plural counts too: a farmer writes "armyworms" for the armyworm.
    if ((padded.includes(` ${phrase} `) || padded.includes(` ${phrase}s `)) && !names.has(phrase)) names.set(phrase, name);
  }
  return { keywords: found(entry, padded), names: [...names.values()] };
}

/**
 * The keywords and names that count, and their score. A phrase that sits inside a longer phrase another entry matched
 * is ignored: "atangya" in "itim na atangya" belongs to the black bug, not the rice bug.
 */
function scoreFound({ keywords, names }: Found, longer: readonly string[]): { hits: string[]; score: number } {
  const insideLonger = (phrase: string) => longer.some((q) => q !== phrase && ` ${q} `.includes(` ${phrase} `));
  const hits = keywords.filter((k) => !insideLonger(normalize(k)));
  const counted = new Set(hits.map(normalize));
  let score = hits.length;
  for (const name of names) {
    const phrase = normalize(name);
    if (insideLonger(phrase)) continue;
    if (counted.has(phrase)) {
      // Already counted as a keyword: add only the extra weight.
      score += NAME_WEIGHT - 1;
    } else {
      hits.push(name);
      score += NAME_WEIGHT;
    }
  }
  return { hits, score };
}

/** The keywords and insect names of one entry the text contains, as written in the note. Shown to the farmer as "Dahil sa". */
export function keywordHits(entry: KnowledgeEntry, text: string): string[] {
  return [...new Set(scoreFound(foundIn(entry, ` ${normalize(text)} `), []).hits)];
}

/**
 * Keyword scoring over the local knowledge base. Fully offline and deterministic.
 * A keyword counts only as a whole word or phrase, so "bph" does not match "bphx". An insect's own name counts double,
 * and a phrase that is part of a longer phrase another entry matched does not count.
 */
export function matchKeywords(
  text: string,
  crop: Crop | 'any',
  entries: readonly KnowledgeEntry[],
  limit = 2,
): KeywordResult {
  const query = normalize(text);
  if (!query) return { matches: [], clear: false };
  const padded = ` ${query} `;

  const candidates = entries
    .filter((entry) => crop === 'any' || entry.crop === crop)
    .map((entry) => ({ entry, found: foundIn(entry, padded) }));

  const scored: KeywordMatch[] = candidates
    .map(({ entry, found: f }) => {
      const longer = candidates.filter((c) => c.entry !== entry).flatMap((c) => [...c.found.names, ...c.found.keywords].map(normalize));
      const { hits, score } = scoreFound(f, longer);
      return { entry, score, hits: [...new Set(hits)] };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));

  const matches = scored.slice(0, limit);
  const clear = matches.length === 1 || (matches.length > 1 && matches[0].score > matches[1].score);
  return { matches, clear };
}

/**
 * Sign words that fit many problems, or none: yellowing, paleness, wilting, drying. Yellow leaves alone can be a
 * lack of fertilizer, water stress, a virus, or ripening, so they never decide a problem on their own.
 * English, Tagalog, and Cebuano, on normalized text.
 */
const VAGUE_SIGN =
  /\b(yellow|yellowing|yellowish|yellowed|pale|wilting|wilted|wilts?|drying|dried|dry|dying|sick|unhealthy|weak|dilaw|madilaw|naninilaw|nanilaw|nagdidilaw|nagdilaw|dumidilaw|nadilaw|paninilaw|lanta|nalalanta|nalanta|nanlalanta|natutuyo|natuyo|tuyo|namamatay|namatay|matamlay|may sakit|dalag|nagdalag|nagkadalag|madalag|dalagon|nalaya|nangalaya|nalawos|nauga|uga|nangamatay|masakiton)\b/;

/**
 * Words that tell problems apart: an insect or its eggs, a spot, streak, hole, or bite, a rot or mold, a color other
 * than yellow, stunting, curling or rolling, a burn, a smell, an empty grain or a center shoot that pulls out, or where
 * on the plant. Any one of them makes a description specific.
 */
const SPECIFIC_SIGN =
  /\b(insects?|bugs?|worms?|caterpillars?|larva|larvae|hoppers?|aphids?|ants?|snails?|rats?|eggs?|spots?|streaks?|stripes?|lines?|holes?|bites?|eaten|chewed|cut|torn|rot|rotten|rotting|mold|mould|fuzz|powder|white|brown|gray|grey|black|red|reddish|orange|rust|stunted|short|curled|curling|rolled|folded|burned|burnt|scorched|edges?|tips?|patch(es)?|kulisap|insekto|uod|ulod|higad|kuto|langgam|kuhol|suso|daga|ilaga|itlog|batik|tulbok|mantsa|guhit|gilis|linya|butas|lungag|kagat|kinain|kinakain|gisi|punit|putol|naputol|bulok|nabubulok|amag|agup op|puti|maputi|kayumanggi|kape|abo|abuhin|abuhon|itim|nangingitim|itom|pula|mapula|kahel|dalandan|kalawang|bansot|pandak|kulang tubo|kulot|kulubot|bilot|tiklop|sunog|nasunog|gilid|ngilit|kilid|dulo|tumatalon|lumilipad|molukso|middle|center|centre|whorl|pulls?|pulled|empty|smells?|gitna|gitnang|ubod|puso|tunga|hilahin|bunot|nabubunot|hugutin|ibton|hungkag|walang laman|walay sulod|baho|mabaho|nabali|bali|nakabilot)\b/;

/**
 * True when the texts name a sign only in vague words ("dilaw ang dahon", "yellow leaves", "nalalanta ang mais"),
 * with nothing that tells one problem from another. A matcher with no keyword for it must not guess a problem from
 * such words: the app asks the farmer for a telling detail instead.
 */
export function onlyVagueSigns(...texts: readonly string[]): boolean {
  const t = ` ${normalize(texts.join(' '))} `;
  return VAGUE_SIGN.test(t) && !SPECIFIC_SIGN.test(t);
}
