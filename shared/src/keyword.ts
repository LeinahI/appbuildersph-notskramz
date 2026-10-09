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

/** The keywords of one entry the text contains, as written in the note. Shown to the farmer as "Dahil sa". */
export function keywordHits(entry: KnowledgeEntry, text: string): string[] {
  return [...new Set(found(entry, ` ${normalize(text)} `))];
}

/**
 * Keyword scoring over the local knowledge base. Fully offline and deterministic.
 * A keyword counts only as a whole word or phrase, so "bph" does not match "bphx".
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

  const scored: KeywordMatch[] = entries
    .filter((entry) => crop === 'any' || entry.crop === crop)
    .map((entry) => {
      const hits = found(entry, padded);
      return { entry, score: hits.length, hits: [...new Set(hits)] };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));

  const matches = scored.slice(0, limit);
  const clear = matches.length === 1 || (matches.length > 1 && matches[0].score > matches[1].score);
  return { matches, clear };
}
