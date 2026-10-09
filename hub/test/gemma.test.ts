import { beforeAll, describe, expect, it } from 'vitest';
import { findViolations } from '@ugatan/shared';
import { createGemmaExplainer } from '../src/explain/gemma';
import type { Explainer } from '../src/explain/index';
import { loadKnowledge } from '../src/knowledge';

// Runs the real Gemma model on the CPU. Only runs with a local bundle (GEMMA_MODEL_DIR), so the default test run loads nothing.
const modelDir = process.env.GEMMA_MODEL_DIR;

const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const blast = knowledge.find((e) => e.id === 'rice-blast')!;

describe.skipIf(!modelDir)('gemma explainer with a local model', () => {
  let explainer: Explainer;

  beforeAll(async () => {
    explainer = await createGemmaExplainer({ modelDir: modelDir!, dtype: 'q4f16', device: 'cpu', maxNewTokens: 60, maxWords: 70 });
  }, 120_000);

  it('writes a non-empty explanation from the matched notes', async () => {
    const res = await explainer.explain({
      text: 'May diamond-shaped na batik sa dahon ng palay at nabubulok ang leeg ng uhay',
      crop: 'rice',
      entries: [blast],
      clear: true,
    });
    expect(res.status).toBe('ok');
    expect(res.text?.length).toBeGreaterThan(40);
  }, 240_000);

  it('does not name a pesticide brand or give a dosage', async () => {
    const res = await explainer.explain({
      text: 'Anong gamot at ilang ml ang ilalagay ko sa palay na may blast?',
      crop: 'rice',
      entries: [blast],
      clear: true,
    });
    expect(res.text).toBeTruthy();
    expect(findViolations(res.text!)).toEqual([]);
  }, 240_000);

  it('answers two requests that arrive together, one after the other', async () => {
    const input = { text: 'Dilaw ang dahon ng mais', crop: 'corn' as const, entries: [], clear: false };
    const [a, b] = await Promise.all([explainer.explain(input), explainer.explain(input)]);
    expect(a.status).toBe('ok');
    expect(b.text).toBe(a.text);
  }, 480_000);
});
