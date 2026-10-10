import { describe, expect, it, vi } from 'vitest';
import { NO_SIGNS, OTHER_CROP, type KnowledgeEntry } from '@ugatan/shared';
import { matchOnPhone } from '../src/lib/hybrid';
import { buildChoiceSequence, confidenceFromProbs, pyJsonDumps, readChoice } from '../src/lib/laya-sequence';

const entry = (id: string, keywords: string[]): KnowledgeEntry => ({
  id,
  crop: 'rice',
  name: id,
  keywords,
  signs: [`${id} sign`],
  actions: [`${id} action`],
  callExpertIf: 'It spreads',
  reviewedBy: '',
  reviewedOn: '',
});

const knowledge = [entry('yellowing', ['yellow leaves', 'dilaw']), entry('holes', ['holes', 'butas'])];

describe('the phone hybrid matcher, as on the hub', () => {
  it('keeps a clear keyword answer and asks neither Gemma nor Laya', async () => {
    const describeFn = vi.fn();
    const laya = vi.fn();
    const outcome = await matchOnPhone('dilaw ang palay', 'any', { knowledge, describe: describeFn, laya });
    expect(outcome).toMatchObject({ ids: ['yellowing'], clear: true });
    expect(describeFn).not.toHaveBeenCalled();
    expect(laya).not.toHaveBeenCalled();
  });

  it('matches nothing when Gemma finds no sign or another crop', async () => {
    for (const answer of [NO_SIGNS, OTHER_CROP]) {
      const outcome = await matchOnPhone('kumusta po', 'any', { knowledge, describe: async () => answer, laya: vi.fn() });
      expect(outcome).toMatchObject({ ids: [], clear: false, noSigns: true });
    }
  });

  it('takes a Laya answer on the English only when keyword found that problem too', async () => {
    const describeFn = async () => 'yellow leaves and holes';
    const supported = await matchOnPhone('hindi ko alam', 'any', { knowledge, describe: describeFn, laya: async () => ({ ids: ['holes'], clear: true }) });
    expect(supported).toMatchObject({ ids: ['holes'], clear: true, english: 'yellow leaves and holes' });

    const unsupported = await matchOnPhone('hindi ko alam', 'any', { knowledge, describe: describeFn, laya: async () => ({ ids: ['other'], clear: true }) });
    expect(unsupported.clear).toBe(false);
    expect([...unsupported.ids].sort()).toEqual(['holes', 'yellowing']);
  });

  it('matches nothing on vague words alone, instead of letting Laya pick an unrelated problem', async () => {
    // Regression: "dilaw ang dahon" (yellow leaves) came back as armyworm. Here no note has a keyword for it.
    const none = [entry('holes', ['holes', 'butas'])];
    const laya = vi.fn(async () => ({ ids: ['armyworm'], clear: true }));
    const withGemma = await matchOnPhone('dilaw ang dahon', 'any', { knowledge: none, describe: async () => 'Yellow leaves.', laya });
    expect(withGemma).toMatchObject({ ids: [], clear: false, english: 'Yellow leaves.' });
    const withoutGemma = await matchOnPhone('dilaw ang dahon', 'any', { knowledge: none, laya });
    expect(withoutGemma).toMatchObject({ ids: [], clear: false });
    expect(laya).not.toHaveBeenCalled();
  });

  it('falls back to keyword candidates when Laya fails', async () => {
    const outcome = await matchOnPhone('dilaw at butas', 'any', {
      knowledge,
      laya: async () => {
        throw new Error('no memory');
      },
    });
    expect(outcome.clear).toBe(false);
    expect(outcome.ids.sort()).toEqual(['holes', 'yellowing']);
  });
});

describe('Laya port for the phone', () => {
  const ids = { cls: 1, sep: 2, mask: 3, pad: 0, maskTok: '[MASK]' };
  // One id per word, so the layout is easy to read.
  const vocab = new Map<string, number>();
  const encode = (text: string) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => vocab.get(w) ?? (vocab.set(w, 100 + vocab.size), vocab.get(w)!));

  it('lays out [CLS] question [SEP] [MASK] option... [SEP] state [SEP], as rl_common.build_sequence does', () => {
    const seq = buildChoiceSequence(encode, ids, { description: 'dilaw' }, 'Which one?', ['Blast: spots', 'Borer: holes'], 192, 176);
    expect(seq.ids[0]).toBe(ids.cls);
    expect(seq.options).toEqual(['Blast: spots', 'Borer: holes']);
    expect(seq.markers.map((m) => seq.ids[m])).toEqual([ids.mask, ids.mask]);
    expect(seq.ids.at(-1)).toBe(ids.sep);
    expect(seq.ids.filter((v) => v === ids.sep)).toHaveLength(3);
  });

  it('serializes the state like Python json.dumps', () => {
    expect(pyJsonDumps({ description: 'dilaw', n: 2, ok: true })).toBe('{"description": "dilaw", "n": 2, "ok": true}');
  });

  it('reads confidence as 1 minus normalized entropy, with the per-size temperature', () => {
    expect(confidenceFromProbs([0.5, 0.5])).toBeCloseTo(0);
    expect(confidenceFromProbs([1, 0])).toBeCloseTo(1);
    const config = { max_len: 192, head_max_len: 176, temperature: [2], temperature_by_options: { 'choice:2': 1 } };
    const { probabilities, confidence } = readChoice(new Float32Array([4, 0]), 2, config);
    expect(probabilities[0]).toBeGreaterThan(probabilities[1]!);
    expect(confidence).toBeGreaterThan(0.5);
  });
});
