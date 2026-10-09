import { describe, expect, it } from 'vitest';
import { createKeywordMatcher } from '../src/matchers/keyword';
import { loadKnowledge } from '../src/knowledge';

const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));

describe('keyword matcher', () => {
  it('needs two keywords for a clear answer when minScore is 2', async () => {
    const oneWord = 'There are pink eggs.';
    expect((await createKeywordMatcher(knowledge).match(oneWord, 'rice')).clear).toBe(true);
    const strict = createKeywordMatcher(knowledge, { minScore: 2 });
    expect(await strict.match(oneWord, 'rice')).toEqual({ ids: ['golden-apple-snail'], clear: false });
    expect((await strict.match('Seedlings were cut at the water line and there are pink eggs.', 'rice')).clear).toBe(true);
  });

  it.each([
    ['Ang tunga nga dahon sa humay nauga ug dali ra ibton, ug ang uhay walay sulod', 'stem-borer'],
    ['Daghang kuhol sa humayan ug naay rosas nga itlog sa punoan', 'golden-apple-snail'],
    ['Gisi-gisi ang dahon sa mais ug naay ulod nga itom ang ulo', 'fall-armyworm'],
    ['Bansot ang mais at may puting himulmol sa ilalim ng dahon', 'downy-mildew'],
    ['Yung palay parang nasunog, andaming kayumangging insekto sa paanan', 'bph'],
  ])('reads Tagalog, Taglish, and Cebuano farmer words offline: %s', async (text, id) => {
    expect(await createKeywordMatcher(knowledge).match(text, 'any')).toMatchObject({ ids: [id], clear: true });
  });
});
