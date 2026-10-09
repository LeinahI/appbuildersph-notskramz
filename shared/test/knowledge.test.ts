import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertValidEntries, validateEntry, type KnowledgeEntry } from '../src/index';

const KNOWLEDGE_DIR = new URL('../../knowledge/', import.meta.url);

function loadKnowledge(): { file: string; value: unknown }[] {
  return readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, value: JSON.parse(readFileSync(new URL(f, KNOWLEDGE_DIR), 'utf8')) }));
}

describe('knowledge base files', () => {
  const files = loadKnowledge();

  it('has the eight rice and corn problems from the business plan', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(files.map((f) => [f.file, f] as const))('%s is a valid entry', (_name, { file, value }) => {
    expect(validateEntry(value, file.replace(/\.json$/, ''))).toEqual([]);
  });

  it('loads as a valid, unique set', () => {
    const entries = files.map((f) => f.value as KnowledgeEntry);
    expect(() => assertValidEntries(entries)).not.toThrow();
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
