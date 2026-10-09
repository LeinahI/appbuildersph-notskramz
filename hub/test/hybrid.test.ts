import { describe, expect, it } from 'vitest';
import { createHybridMatcher } from '../src/matchers/hybrid';
import type { MatchOutcome, Matcher } from '../src/matchers/index';

function stub(name: 'keyword' | 'laya', outcome: MatchOutcome | Error): Matcher & { calls: number } {
  const m = {
    name,
    calls: 0,
    async match() {
      m.calls++;
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
  };
  return m;
}

describe('hybrid matcher', () => {
  it('returns a clear keyword answer without asking Laya', async () => {
    const keyword = stub('keyword', { ids: ['bph'], clear: true });
    const laya = stub('laya', { ids: ['rice-blast'], clear: true });
    expect(await createHybridMatcher(keyword, laya).match('x', 'any')).toEqual({ ids: ['bph'], clear: true });
    expect(laya.calls).toBe(0);
  });

  it('uses a clear Laya answer when keyword is not sure', async () => {
    const keyword = stub('keyword', { ids: [], clear: false });
    const laya = stub('laya', { ids: ['rice-blast', 'bph'], clear: true });
    expect(await createHybridMatcher(keyword, laya).match('x', 'any')).toEqual({ ids: ['rice-blast', 'bph'], clear: true });
  });

  it('is not sure when neither is sure, and prefers keyword candidates', async () => {
    const keyword = stub('keyword', { ids: ['stem-borer'], clear: false });
    const laya = stub('laya', { ids: ['rice-blast'], clear: false });
    expect(await createHybridMatcher(keyword, laya).match('x', 'any')).toEqual({ ids: ['stem-borer'], clear: false });
    const none = stub('keyword', { ids: [], clear: false });
    expect(await createHybridMatcher(none, laya).match('x', 'any')).toEqual({ ids: ['rice-blast'], clear: false });
  });

  it('falls back to the keyword answer when Laya throws', async () => {
    const keyword = stub('keyword', { ids: ['stem-borer'], clear: false });
    const laya = stub('laya', new Error('onnx failed'));
    expect(await createHybridMatcher(keyword, laya).match('x', 'any')).toEqual({ ids: ['stem-borer'], clear: false });
  });

  it('is named hybrid', () => {
    const none: MatchOutcome = { ids: [], clear: false };
    expect(createHybridMatcher(stub('keyword', none), stub('laya', none)).name).toBe('hybrid');
  });
});

describe('hybrid matcher with Gemma describing first', () => {
  /** Matcher stub that answers by the text it gets, so the test can tell the farmer's words from Gemma's English. */
  function byText(name: 'keyword' | 'laya', answers: Record<string, MatchOutcome>): Matcher & { seen: string[] } {
    const m = {
      name,
      seen: [] as string[],
      async match(text: string) {
        m.seen.push(text);
        return answers[text] ?? { ids: [], clear: false };
      },
    };
    return m;
  }
  const farmer = 'Ang tunga nga dahon sa humay nauga ug dali ra ibton';
  const english = 'The middle leaf of the rice plant dried and pulls out easily.';
  const describe = async () => english;

  it('does not describe when keyword is already sure', async () => {
    let calls = 0;
    const keyword = byText('keyword', { [farmer]: { ids: ['stem-borer'], clear: true } });
    const counting = async () => {
      calls++;
      return english;
    };
    const res = await createHybridMatcher(keyword, byText('laya', {}), { describe: counting }).match(farmer, 'rice');
    expect(res).toEqual({ ids: ['stem-borer'], clear: true });
    expect(calls).toBe(0);
  });

  it('matches keyword on the English when the farmer words are not clear', async () => {
    const englishKeyword = byText('keyword', { [english]: { ids: ['stem-borer'], clear: true } });
    const laya = byText('laya', {});
    const res = await createHybridMatcher(byText('keyword', {}), laya, { describe, englishKeyword }).match(farmer, 'rice');
    expect(res).toEqual({ ids: ['stem-borer'], clear: true, english });
    expect(laya.seen).toEqual([]);
  });

  it('gives Laya the English, and takes its answer when keyword found the same problem', async () => {
    const englishKeyword = byText('keyword', { [english]: { ids: ['rice-blast', 'stem-borer'], clear: false } });
    const laya = byText('laya', { [english]: { ids: ['stem-borer', 'rice-blast'], clear: true } });
    const res = await createHybridMatcher(byText('keyword', {}), laya, { describe, englishKeyword }).match(farmer, 'rice');
    expect(laya.seen).toEqual([english]);
    expect(res).toEqual({ ids: ['stem-borer', 'rice-blast'], clear: true, english });
  });

  it('is not sure when Laya picks a problem no keyword supports', async () => {
    const laya = byText('laya', { [english]: { ids: ['rice-blast'], clear: true } });
    const englishKeyword = byText('keyword', {});
    const res = await createHybridMatcher(byText('keyword', {}), laya, { describe, englishKeyword }).match(farmer, 'rice');
    expect(res).toEqual({ ids: ['rice-blast'], clear: false, english });
  });

  it('matches the farmer words when Gemma has nothing or fails', async () => {
    const laya = byText('laya', { [farmer]: { ids: ['stem-borer'], clear: true } });
    const nothing = async () => null;
    const failing = async (): Promise<string> => {
      throw new Error('gpu lost');
    };
    for (const d of [nothing, failing]) {
      expect(await createHybridMatcher(byText('keyword', {}), laya, { describe: d }).match(farmer, 'rice')).toEqual({
        ids: ['stem-borer'],
        clear: true,
      });
    }
  });
});
