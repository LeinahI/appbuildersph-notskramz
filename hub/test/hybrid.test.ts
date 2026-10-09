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
