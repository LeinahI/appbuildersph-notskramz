/**
 * Error rates for scoring speech writing. Both compare the hub's text with the correct text after the same cleaning:
 * lower case, no punctuation, one space between words. Word error rate is harsh on Tagalog and Cebuano, where one
 * wrong letter ("putulin" for "patulin") makes a whole wrong word, so the character rate is reported next to it.
 */

/** The words of a text: lower case, letters and digits and apostrophes only. */
export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Smallest number of single-item insertions, deletions, and replacements that turn `a` into `b`. */
export function editDistance<T>(a: readonly T[], b: readonly T[]): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length]!;
}

export interface ErrorCounts {
  wordErrors: number;
  words: number;
  charErrors: number;
  chars: number;
}

/** The errors in one hypothesis against its reference. */
export function errorCounts(reference: string, hypothesis: string): ErrorCounts {
  const ref = wordsOf(reference);
  const hyp = wordsOf(hypothesis);
  const refChars = [...ref.join(' ')];
  const hypChars = [...hyp.join(' ')];
  return {
    wordErrors: editDistance(ref, hyp),
    words: ref.length,
    charErrors: editDistance(refChars, hypChars),
    chars: refChars.length,
  };
}
