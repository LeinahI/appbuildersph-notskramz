import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DISCLAIMER,
  composeAnswer,
  findViolations,
  isSafeText,
  matchKeywords,
  type KnowledgeEntry,
} from '../src/index';

const KNOWLEDGE_DIR = new URL('../../knowledge/', import.meta.url);
const KB: KnowledgeEntry[] = readdirSync(KNOWLEDGE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, KNOWLEDGE_DIR), 'utf8')) as KnowledgeEntry);

describe('pesticide guardrail', () => {
  it.each([
    ['Gamitin ang Karate, 2 ml kada litro', 'brand'],
    ['Mag-spray ng Cymbush sa palayan', 'brand'],
    ['Apply Furadan at 3 kg per hectare', 'brand'],
    ['Maglagay ng 100 g kada ektarya', 'dosage'],
    ['Gumamit ng 2ml sa bawat tangke', 'dosage'],
    ['Isang kutsara sa 16 litro ng tubig', 'dosage'],
  ])('blocks "%s"', (text, kind) => {
    const found = findViolations(text);
    expect(found.some((v) => v.kind === kind)).toBe(true);
    expect(isSafeText(text)).toBe(false);
  });

  it.each([
    'Tingnan ang base ng mga halaman para sa maliliit na insekto',
    'Iwasan ang sobrang nitrogen at hatiin ang abono sa mas maliit na dosis',
    'Tawagan ang agriculturist kung kumakalat na ang sira',
  ])('allows plain field advice: "%s"', (text) => {
    expect(findViolations(text)).toEqual([]);
  });

  it('keeps every curated note free of brands and dosages', () => {
    for (const entry of KB) {
      const answer = composeAnswer({ result: { matches: [{ entry, score: 1 }], clear: true } });
      expect(findViolations(answer.text), entry.id).toEqual([]);
    }
  });

  it('keeps every answer free of brands and dosages, for every entry matched by its keywords', () => {
    for (const entry of KB) {
      const query = entry.keywords.join(' ');
      const result = matchKeywords(query, 'any', KB);
      const answer = composeAnswer({ result, explanation: null });
      expect(findViolations(answer.text), query).toEqual([]);
    }
  });
});

describe('composeAnswer', () => {
  const entry = KB[0];

  it('ends every answer with the exact disclaimer', () => {
    const answer = composeAnswer({ result: { matches: [{ entry, score: 1 }], clear: true } });
    expect(answer.text.endsWith(DISCLAIMER)).toBe(true);
    expect(DISCLAIMER).toBe('Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide.');
  });

  it('ends a no-match answer with the disclaimer too', () => {
    const answer = composeAnswer({ result: { matches: [], clear: false } });
    expect(answer.text).toContain('Walang malinaw na tugma');
    expect(answer.text.endsWith(DISCLAIMER)).toBe(true);
  });

  it('shows "not sure, call the agriculturist" when the match is not clear', () => {
    const answer = composeAnswer({ result: { matches: [{ entry, score: 1 }], clear: false } });
    expect(answer.text).toContain('Hindi tiyak. Tawagan ang lokal na agriculturist');
  });

  it('shows the AI explanation when it passes the guardrail', () => {
    const answer = composeAnswer({
      result: { matches: [{ entry, score: 1 }], clear: true },
      explanation: 'Tingnan ang base ng mga halaman.',
    });
    expect(answer.explanationUsed).toBe(true);
    expect(answer.text).toContain('Paliwanag:');
  });

  it('drops an AI explanation that names a brand or gives a dosage, and says so', () => {
    const answer = composeAnswer({
      result: { matches: [{ entry, score: 1 }], clear: true },
      explanation: 'Gamitin ang Karate, 2 ml kada litro.',
    });
    expect(answer.explanationBlocked).toBe(true);
    expect(answer.explanationUsed).toBe(false);
    expect(answer.text).not.toContain('Karate');
    expect(answer.text.endsWith(DISCLAIMER)).toBe(true);
  });
});
