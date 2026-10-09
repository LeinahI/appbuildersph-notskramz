import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PHOTO_FORM, keywordHits, matchKeywords, photoFormText, photoIsSure, readPhotoForm, type KnowledgeEntry } from '../src/index';

const KNOWLEDGE_DIR = new URL('../../knowledge/', import.meta.url);
const KB: KnowledgeEntry[] = readdirSync(KNOWLEDGE_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, KNOWLEDGE_DIR), 'utf8')) as KnowledgeEntry);

const sentences = PHOTO_FORM.flatMap((q) => q.choices.map(([, sentence]) => sentence)).filter((s): s is string => s !== null);

describe('the photo form', () => {
  it('can reach every problem in the knowledge base from at least one choice', () => {
    const unreachable = KB.filter((entry) => !sentences.some((s) => keywordHits(entry, s).length > 0)).map((e) => e.id);
    expect(unreachable).toEqual([]);
  });

  it('names no pest or disease in its questions or choices', () => {
    const names = KB.map((e) => e.name.split(/ \(| \/ /)[0]!.toLowerCase());
    const text = photoFormText().toLowerCase();
    for (const name of names) expect(text).not.toContain(name);
  });

  it('turns the picks into a description the matcher reads like a typed report', () => {
    const raw = [
      '1. corn',
      '2. ragged holes',
      '3. young leaves in the whorl',
      '4. scraped white patches',
      '5. none',
      '6. sawdust-like droppings',
      '7. none',
      '8. none',
      '9. none',
      '10. normal',
      '11. none or not visible',
    ].join('\n');
    const read = readPhotoForm(raw);
    expect(read).toMatchObject({
      kind: 'signs',
      english:
        'Corn plant. Ragged holes in the leaves. The damage is in the whorl, on the young leaves. Scraped white patches on the leaves. Sawdust like droppings.',
    });
    const result = matchKeywords(read!.kind === 'signs' ? read!.english : '', 'corn', KB);
    expect(result.matches[0]!.entry.id).toBe('fall-armyworm');
    expect(result.clear).toBe(true);
  });

  it('reads scraped streaks as leaffolder on rice and fall armyworm on corn', () => {
    const corn = readPhotoForm('corn\nwhite see-through streaks');
    const rice = readPhotoForm('rice\nwhite see-through streaks');
    expect(matchKeywords(corn!.kind === 'signs' ? corn!.english : '', 'corn', KB).matches[0]!.entry.id).toBe('fall-armyworm');
    expect(matchKeywords(rice!.kind === 'signs' ? rice!.english : '', 'rice', KB).matches[0]!.entry.id).toBe('rice-leaffolder');
  });

  it('reads the answer whatever the layout: one line with commas, or a list', () => {
    const oneLine = readPhotoForm('corn, ragged holes, young leaves in the whorl, scraped white patches, none, none');
    expect(oneLine).toMatchObject({
      kind: 'signs',
      english: 'Corn plant. Ragged holes in the leaves. The damage is in the whorl, on the young leaves. Scraped white patches on the leaves.',
    });
    expect(readPhotoForm('rice\n- white empty grain heads')).toMatchObject({ kind: 'signs', english: 'Rice plant. Whiteheads: white and empty panicles.' });
  });

  it('keeps the signs when the plant pick is wrong, and reads another plant only when no sign was listed', () => {
    expect(readPhotoForm('another plant, ragged holes')).toMatchObject({ kind: 'signs', english: 'Plant. Ragged holes in the leaves.' });
    expect(readPhotoForm('another plant')).toEqual({ kind: 'not-plant' });    expect(readPhotoForm('rice\nnone')).toEqual({ kind: 'no-signs' });
  });

  it('gives back null for an answer that names no plant and no sign, so the hub reads it as free text', () => {
    expect(readPhotoForm('The leaves look unusual.')).toBeNull();
    // The model sometimes writes the plant and its picks on one line with no commas.
    expect(readPhotoForm('Corn pink egg clusters')).toMatchObject({ kind: 'signs', english: 'Corn plant. Pink egg clusters on the stems.' });
    // A free-text sentence that only mentions the crop is not a plant pick.
    expect(readPhotoForm('Rice leaf with diamond shaped spots that have a gray center.')).toBeNull();
    expect(readPhotoForm('Not rice or corn.')).toBeNull();
    expect(readPhotoForm(null)).toBeNull();
  });
});

describe('when a photo alone is enough to be sure', () => {
  it('needs two different picked signs for the problem', () => {
    expect(photoIsSure('fall-armyworm', ['Ragged holes in the leaves.', 'Sawdust like droppings.'], KB)).toBe(true);
    // One picked sign carries three keywords of the problem, but it is still one sign.
    expect(photoIsSure('bacterial-leaf-blight', ['Water soaked stripes along the leaf edges, yellow then white.'], KB)).toBe(false);
  });
});
