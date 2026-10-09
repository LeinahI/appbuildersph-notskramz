import { beforeAll, describe, expect, it } from 'vitest';
import { findViolations } from '@ugatan/shared';
import { createGemmaLlamaCppExplainer } from '../src/explain/gemma-llamacpp';
import type { Describer, Explainer } from '../src/explain/index';
import { loadKnowledge } from '../src/knowledge';

// Runs the real Gemma GGUF through llama.cpp. Only runs with a local file (GEMMA_GGUF), so the default test run loads nothing.
const modelPath = process.env.GEMMA_GGUF;

const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const blast = knowledge.find((e) => e.id === 'rice-blast')!;
const bph = knowledge.find((e) => e.id === 'bph')!;

describe.skipIf(!modelPath)('gemma explainer on llama.cpp with a local model', () => {
  let explainer: Explainer & Describer;

  beforeAll(async () => {
    explainer = await createGemmaLlamaCppExplainer({ modelPath: modelPath!, maxNewTokens: 128, maxWords: 70 });
  }, 180_000);

  it('writes a non-empty explanation from the matched notes, quickly', async () => {
    const started = Date.now();
    const res = await explainer.explain({
      text: 'May diamond-shaped na batik sa dahon ng palay at nabubulok ang leeg ng uhay',
      crop: 'rice',
      entries: [blast],
      clear: true,
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
      clear: true,
    });
    expect(res.text).toBeTruthy();
    expect(findViolations(res.text!)).toEqual([]);
  }, 60_000);

  it('says it is not sure and points to the agriculturist when the matcher is not sure', async () => {
    const res = await explainer.explain({
      text: 'May sira ang palay ko, parang natutuyo',
      crop: 'rice',
      entries: [blast, bph],
      clear: false,
    });
    expect(res.status).toBe('ok');
    expect(res.text).toMatch(/agriculturist|technician|DA/i);
    expect(res.text).toMatch(/hindi (ako )?(sigurado|tiyak)|not sure|di sigurado/i);
  }, 60_000);

  it('describes Cebuano and Tagalog questions in plain English without naming the problem', async () => {
    const ceb = await explainer.describe('Ang tunga nga dahon sa humay nauga ug dali ra ibton, ug ang uhay puti ug walay sulod', 'any');
    expect(ceb).toMatch(/rice/i);
    expect(ceb).not.toMatch(/corn/i);
    expect(ceb).toMatch(/pull/i);
    const tl = await explainer.describe('May kumpol ng kulay rosas na itlog sa tangkay ng palay at naputol ang punla', 'rice');
    expect(tl).toMatch(/pink/i);
    expect(tl).toMatch(/egg/i);
    for (const english of [ceb, tl]) expect(english).not.toMatch(/stem borer|snail|blast|blight/i);
  }, 60_000);

  it('does not invent signs when the farmer gives none', async () => {
    for (const text of [
      'Ok naman dati yung mais ko pero ngayon parang may mali, help po',
      'Dili maayo ang tubo sa akong mais karon, unsa kaha ni',
      'Parang may sakit ang palay ko pero hindi ko alam kung ano na',
    ]) {
      const english = await explainer.describe(text, 'any');
      // null ("No signs.") or a sentence saying no signs were named. Never a made-up sign.
      if (english !== null) expect(english, text).toMatch(/no\b.*\bsigns?/i);
      expect(english ?? '', text).not.toMatch(/pale|yellow|spot|hole|insect|worm|egg/i);
    }
  }, 60_000);

  it('answers two requests that arrive together, one after the other', async () => {
    const input = { text: 'Dilaw ang dahon ng mais', crop: 'corn' as const, entries: [], clear: false };
    const [a, b] = await Promise.all([explainer.explain(input), explainer.explain(input)]);
    expect(a.status).toBe('ok');
    expect(b.text).toBe(a.text);
  }, 120_000);
});
