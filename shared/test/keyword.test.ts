import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matchKeywords, normalize, onlyVagueSigns, type KnowledgeEntry } from '../src/index';

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

describe('vague signs', () => {
  const KNOWLEDGE_DIR = new URL('../../knowledge/', import.meta.url);
  const REAL: KnowledgeEntry[] = readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(f, KNOWLEDGE_DIR), 'utf8')) as KnowledgeEntry);

  it.each([
    'dilaw ang dahon',
    'Dilaw ang dahon ng mais',
    'naninilaw ang dahon ng palay ko',
    'nalalanta ang mais',
    'dalag ang dahon sa humay',
    'nangalaya ang akong mais',
    'yellow leaves',
    'The corn leaves are turning yellow.',
  ])('"%s" names only a vague sign, and no note claims it', (text) => {
    expect(onlyVagueSigns(text)).toBe(true);
    // Regression: "dilaw ang dahon" used to end as armyworm through Laya. No keyword supports any problem here.
    expect(matchKeywords(text, 'any', REAL).matches).toEqual([]);
  });

  it.each([
    'dilaw ang dahon at may butas',
    'dilaw na guhit sa dahon',
    'yellow leaves with brown spots',
    'naninilaw at may maliliit na kulisap',
    'dalag ang dahon ug naay ulod',
    'nalalanta ang gitnang dahon at madaling hilahin',
    'The middle leaf of the rice plant dried and pulls out easily.',
    'may uod sa dahon',
    'hello po',
  ])('"%s" is not only vague', (text) => {
    expect(onlyVagueSigns(text)).toBe(false);
  });

  it('reads the farmer words and the English together', () => {
    expect(onlyVagueSigns('dilaw ang dahon', 'Yellow leaves on the corn.')).toBe(true);
    expect(onlyVagueSigns('dilaw ang dahon', 'Yellow leaves with small holes.')).toBe(false);
  });

  it('knows the Cebuano words for signs the notes already list in Tagalog', () => {
    const top = (text: string) => matchKeywords(text, 'any', REAL).matches[0]?.entry.id;
    expect(top('dalag kahel nga dahon sa humay')).toBe('green-leafhopper');
    expect(top('dalag nga gilis sa dahon sa mais')).toBe('downy-mildew');
    expect(top('nauga sa ngilit ang dahon sa humay')).toBe('bacterial-leaf-blight');
  });
});
