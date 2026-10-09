import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARD_LANGUAGES, assertValidEntries, insectFacts, localizeEntry, validateEntry, type KnowledgeEntry } from '../src/index';

const KNOWLEDGE_DIR = new URL('../../knowledge/', import.meta.url);

function loadKnowledge(): { file: string; value: unknown }[] {
  return readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, value: JSON.parse(readFileSync(new URL(f, KNOWLEDGE_DIR), 'utf8')) }));
}

describe('knowledge base files', () => {
  const files = loadKnowledge();

  it('has the eight problems from the business plan and the insect profiles added later', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it.each(files.map((f) => [f.file, f] as const))('%s is a valid entry', (_name, { file, value }) => {
    expect(validateEntry(value, file.replace(/\.json$/, ''))).toEqual([]);
  });

  it('loads as a valid, unique set', () => {
    const entries = files.map((f) => f.value as KnowledgeEntry);
    expect(() => assertValidEntries(entries)).not.toThrow();
  });

  it('has Tagalog and Cebuano card text for every problem, so the cards read in each farmer language with no model', () => {
    for (const { file, value } of files) {
      const e = value as KnowledgeEntry;
      for (const lang of CARD_LANGUAGES) expect(e.translations?.[lang], `${file} ${lang}`).toBeDefined();
    }
  });

  it('leaves review fields empty until an agronomist signs off', () => {
    for (const { value } of files) {
      const e = value as KnowledgeEntry;
      expect(e.reviewedBy).toBe('');
      expect(e.reviewedOn).toBe('');
    }
  });
});

describe('validateEntry', () => {
  const good: KnowledgeEntry = {
    id: 'test-problem',
    crop: 'corn',
    name: 'Test problem',
    keywords: ['test', 'pagsubok'],
    signs: ['A sign'],
    actions: ['An action'],
    callExpertIf: 'It spreads',
    reviewedBy: '',
    reviewedOn: '',
  };

  it('accepts a complete entry', () => {
    expect(validateEntry(good, 'test-problem')).toEqual([]);
  });

  it('rejects an id that does not match the file name', () => {
    expect(validateEntry(good, 'other')).toContain('id "test-problem" must match the file name "other"');
  });

  it('rejects an unknown crop', () => {
    expect(validateEntry({ ...good, crop: 'wheat' })).toContain('crop must be "rice" or "corn"');
  });

  it('requires reviewedOn once reviewedBy is set', () => {
    expect(validateEntry({ ...good, reviewedBy: 'Agr. Juan' })).toContain('reviewedOn is required once reviewedBy is set');
  });

  it('rejects a pesticide brand or dosage in the notes', () => {
    const errors = validateEntry({ ...good, actions: ['Spray Karate at 2 ml per liter'] });
    expect(errors.some((e) => e.startsWith('brand text "Karate"'))).toBe(true);
    expect(errors.some((e) => e.startsWith('dosage text'))).toBe(true);
  });
});

describe('translations', () => {
  const insect: KnowledgeEntry = {
    id: 'test-bug',
    crop: 'rice',
    name: 'Test bug',
    keywords: ['test bug', 'surot'],
    signs: ['A sign', 'Another sign'],
    actions: ['An action'],
    callExpertIf: 'It spreads',
    insect: {
      commonName: 'Test bug',
      scientificName: 'Testus bugus',
      localNames: ['Surot'],
      stages: ['vegetative'],
      stageNote: 'from seedling',
      biological: ['Spiders'],
    },
    translations: {
      tl: { signs: ['Senyales', 'Isa pang senyales'], actions: ['Hakbang'], callExpertIf: 'Kumakalat', stageNote: 'mula punla', biological: ['Gagamba'] },
    },
    reviewedBy: '',
    reviewedOn: '',
  };

  it('accepts a full translation', () => {
    expect(validateEntry(insect, 'test-bug')).toEqual([]);
  });

  it('needs one item per English item, so no step is lost in translation', () => {
    const short = { ...insect, translations: { tl: { ...insect.translations!.tl!, signs: ['Senyales'] } } };
    expect(validateEntry(short)).toContain('translations.tl.signs must have one item per English item');
  });

  it('needs the insect fields for an insect, and refuses them for a disease', () => {
    const { stageNote: _s, biological: _b, ...bare } = insect.translations!.tl!;
    expect(validateEntry({ ...insect, translations: { tl: bare } })).toContain('translations.tl.stageNote is required for an insect');
    const { insect: _i, ...disease } = insect;
    expect(validateEntry(disease)).toContain('translations.tl: stageNote and biological belong only to an insect');
  });

  it('refuses an unknown language', () => {
    expect(validateEntry({ ...insect, translations: { fr: insect.translations!.tl } })).toContain('translations.fr: language must be one of tl, ceb');
  });

  it('runs the pesticide guardrail on translated text', () => {
    const tl = { ...insect.translations!.tl!, actions: ['Mag-spray ng Karate, dalawang kutsara'] };
    const errors = validateEntry({ ...insect, translations: { tl } });
    expect(errors.some((e) => e.startsWith('brand text "Karate"'))).toBe(true);
    expect(errors.some((e) => e.startsWith('dosage text'))).toBe(true);
  });

  it('localizes the card text and keeps names and keywords', () => {
    const tl = localizeEntry(insect, 'tl');
    expect(tl.signs).toEqual(['Senyales', 'Isa pang senyales']);
    expect(tl.callExpertIf).toBe('Kumakalat');
    expect(tl.name).toBe('Test bug');
    expect(tl.keywords).toEqual(insect.keywords);
    expect(insectFacts(tl)?.biological).toBe('Gagamba');
    expect(insectFacts(tl)?.attacks).toContain('mula punla');
  });

  it('falls back to the English for English or a missing language', () => {
    expect(localizeEntry(insect, 'en')).toBe(insect);
    expect(localizeEntry(insect, 'ceb')).toBe(insect);
  });
});
