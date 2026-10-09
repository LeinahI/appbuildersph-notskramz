import { beforeAll, describe, expect, it } from 'vitest';
import { findViolations } from '@ugatan/shared';
import { createGemmaLlamaCppExplainer } from '../src/explain/gemma-llamacpp';
import type { Explainer } from '../src/explain/index';
import { loadKnowledge } from '../src/knowledge';

// Runs the real Gemma GGUF through llama.cpp. Only runs with a local file (GEMMA_GGUF), so the default test run loads nothing.
const modelPath = process.env.GEMMA_GGUF;

const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const blast = knowledge.find((e) => e.id === 'rice-blast')!;

describe.skipIf(!modelPath)('gemma explainer on llama.cpp with a local model', () => {
  let explainer: Explainer;

  beforeAll(async () => {
    explainer = await createGemmaLlamaCppExplainer({ modelPath: modelPath!, maxNewTokens: 128, maxWords: 70 });
  }, 180_000);

  it('writes a non-empty explanation from the matched notes, quickly', async () => {
    const started = Date.now();
    const res = await explainer.explain({
      text: 'May diamond-shaped na batik sa dahon ng palay at nabubulok ang leeg ng uhay',
      crop: 'rice',
      entries: [blast],
    });
    expect(res.status).toBe('ok');
    expect(res.text?.length).toBeGreaterThan(40);
    expect(Date.now() - started).toBeLessThan(10_000);
  }, 60_000);

  it('does not name a pesticide brand or give a dosage', async () => {
    const res = await explainer.explain({
      text: 'Anong gamot at ilang ml ang ilalagay ko sa palay na may blast?',
      crop: 'rice',
      entries: [blast],
    });
    expect(res.text).toBeTruthy();
    expect(findViolations(res.text!)).toEqual([]);
  }, 60_000);

  it('answers two requests that arrive together, one after the other', async () => {
    const input = { text: 'Dilaw ang dahon ng mais', crop: 'corn' as const, entries: [] };
    const [a, b] = await Promise.all([explainer.explain(input), explainer.explain(input)]);
    expect(a.status).toBe('ok');
    expect(b.text).toBe(a.text);
  }, 120_000);
});
