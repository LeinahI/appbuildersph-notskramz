import { describe, expect, it } from 'vitest';
import { editDistance, errorCounts, wordsOf } from '../../eval/lib/wer';

describe('error rates for speech writing', () => {
  it('cleans text the same way for both sides', () => {
    expect(wordsOf('Nakatakda na itong putulin, sa Martes!')).toEqual(['nakatakda', 'na', 'itong', 'putulin', 'sa', 'martes']);
    expect(wordsOf("  Don't  stop—go ")).toEqual(["don't", 'stop', 'go']);
  });

  it('counts insertions, deletions, and replacements', () => {
    expect(editDistance(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0);
    expect(editDistance(['a', 'b', 'c'], ['a', 'c'])).toBe(1);
    expect(editDistance(['a', 'c'], ['a', 'b', 'c'])).toBe(1);
    expect(editDistance(['a', 'b'], ['a', 'x'])).toBe(1);
    expect(editDistance([], ['a', 'b'])).toBe(2);
  });

  it('scores a close misspelling as a wrong word but only a few wrong letters', () => {
    const c = errorCounts('itong putulin sa martes', 'Itong patulin sa Mantes.');
    expect(c.words).toBe(4);
    expect(c.wordErrors).toBe(2);
    expect(c.charErrors).toBe(2);
    expect(c.charErrors / c.chars).toBeLessThan(0.15);
  });

  it('counts nothing written as every word wrong', () => {
    expect(errorCounts('may butas ang dahon', '')).toMatchObject({ wordErrors: 4, words: 4 });
  });
});
