import { describe, expect, it } from 'vitest';
import { matchKeywords, normalize, type KnowledgeEntry } from '../src/index';

const entry = (id: string, crop: 'rice' | 'corn', keywords: string[]): KnowledgeEntry => ({
  id,
  crop,
  name: id,
  keywords,
  signs: ['s'],
  actions: ['a'],
  callExpertIf: 'c',
  reviewedBy: '',
  reviewedOn: '',
});

const KB = [
  entry('bph', 'rice', ['brown planthopper', 'hopperburn', 'kumpol']),
  entry('blast', 'rice', ['rice blast', 'diamond']),
  entry('armyworm', 'corn', ['armyworm', 'sawdust']),
];

describe('normalize', () => {
  it('lowercases, strips accents and punctuation, and collapses spaces', () => {
    expect(normalize('  Kayumanggí,  ang   DAHON!! ')).toBe('kayumanggi ang dahon');
  });
});

describe('matchKeywords', () => {
  it('returns no matches for empty text', () => {
    expect(matchKeywords('   ', 'any', KB)).toEqual({ matches: [], clear: false });
  });

  it('matches a whole-word keyword and reports a clear result', () => {
    const r = matchKeywords('Maraming kumpol na insekto sa base', 'rice', KB);
    expect(r.matches.map((m) => m.entry.id)).toEqual(['bph']);
    expect(r.clear).toBe(true);
  });

  it('does not match a keyword inside a longer word', () => {
    expect(matchKeywords('kumpolan ng tubig', 'rice', KB).matches).toEqual([]);
  });

  it('matches multi-word phrases', () => {
    expect(matchKeywords('may rice blast sa dahon', 'rice', KB).matches[0].entry.id).toBe('blast');
  });

  it('filters by crop', () => {
    expect(matchKeywords('armyworm sa mais', 'rice', KB).matches).toEqual([]);
    expect(matchKeywords('armyworm sa mais', 'corn', KB).matches[0].entry.id).toBe('armyworm');
  });

  it('is not clear when two entries tie for the top score', () => {
    const r = matchKeywords('rice blast at brown planthopper', 'any', KB);
    expect(r.matches.map((m) => m.score)).toEqual([1, 1]);
    expect(r.clear).toBe(false);
  });

  it('is clear when the top entry scores higher than the runner-up', () => {
    const r = matchKeywords('brown planthopper, hopperburn, at may diamond', 'any', KB);
    expect(r.matches[0].entry.id).toBe('bph');
    expect(r.clear).toBe(true);
  });

  it('is deterministic when scores tie and sorts by id', () => {
    const r = matchKeywords('diamond at armyworm', 'any', KB);
    expect(r.matches.map((m) => m.entry.id)).toEqual(['armyworm', 'blast']);
  });
});
