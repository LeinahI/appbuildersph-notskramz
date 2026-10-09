import { describe, expect, it } from 'vitest';
import { loadKnowledge } from '../src/knowledge';
import { problemOptions } from '../src/matchers/laya';

const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));

// Laya cuts every option to an equal share of 192 tokens when they do not fit. These checks keep the
// option text short and free of the id, so the signs are what survives the cut.
describe('laya problem options', () => {
  const { ids, texts } = problemOptions(knowledge);

  it('has one option per entry, in order', () => {
    expect(ids).toEqual(knowledge.map((e) => e.id));
    expect(texts).toHaveLength(knowledge.length);
  });

  it('has unique option texts, so a choice maps back to one id', () => {
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('does not put the id in the option text', () => {
    ids.forEach((id, i) => expect(texts[i]).not.toContain(id));
  });

  it('starts with the short name, then the first sign', () => {
    const bph = knowledge.find((e) => e.id === 'bph')!;
    expect(texts[ids.indexOf('bph')]).toBe(`Brown planthopper: ${bph.signs.join('; ')}`);
  });
});
