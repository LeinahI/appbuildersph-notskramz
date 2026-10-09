import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Laya, type ChoiceAnswer } from '@receptron/laya';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadKnowledge } from '../src/knowledge';
import { createLayaMatcher, LAYA_INSTRUCTIONS, problemCriteria } from '../src/matchers/laya';
import type { Matcher } from '../src/matchers/index';

// Runs the real Laya model. Only runs with a local bundle (LAYA_MODEL_DIR), so the default test run downloads nothing.
// Checks the matcher contract and the confidence gate. Accuracy is measured by `pnpm eval`.
const modelDir = process.env.LAYA_MODEL_DIR?.trim() || '';
const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
const knownIds = new Set(knowledge.map((e) => e.id));
const cropOf = new Map(knowledge.map((e) => [e.id, e.crop]));

const riceText =
  'Diamond-shaped spots with gray centers on the rice leaves, and the neck of the panicle is rotting';

// Never created. If the local bundle were ignored, a download would land here.
const noDownloadDir = join(tmpdir(), 'ugatan-laya-no-download-expected');

describe.skipIf(!modelDir)('laya matcher with a local bundle', () => {
  let atConfidence: Matcher; // threshold = the model's own confidence for riceText
  let aboveConfidence: Matcher; // threshold a hair above it
  let topChoice: string; // the model's own top answer for riceText
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');

    // Ask the model directly, with the same question and options the matcher uses.
    const laya = await Laya.load({ modelDir });
    const res = await laya.systemOne(
      { description: riceText },
      { problem: { type: 'choice', instructions: LAYA_INSTRUCTIONS, criteria: problemCriteria(knowledge) } },
    );
    const answer = res.answers.problem as ChoiceAnswer;
    topChoice = answer.choice;
    await laya.close();

    atConfidence = await createLayaMatcher(knowledge, {
      cacheDir: noDownloadDir,
      modelDir,
      confidenceThreshold: answer.confidence,
    });
    aboveConfidence = await createLayaMatcher(knowledge, {
      cacheDir: noDownloadDir,
      modelDir,
      confidenceThreshold: answer.confidence + 0.0001,
    });
  }, 240_000);

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  it('loads the local bundle without a network call or a cache folder', () => {
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(existsSync(noDownloadDir)).toBe(false);
  });

  it('puts the model’s own top answer first', async () => {
    const r = await atConfidence.match(riceText, 'any');
    expect(r.ids[0]).toBe(topChoice);
  }, 60_000);

  it('returns at most two known ids', async () => {
    const r = await atConfidence.match(riceText, 'any');
    expect(r.ids.length).toBeGreaterThan(0);
    expect(r.ids.length).toBeLessThanOrEqual(2);
    for (const id of r.ids) expect(knownIds.has(id), id).toBe(true);
  }, 60_000);

  it('is clear at the model’s confidence and not clear a hair above it', async () => {
    expect((await atConfidence.match(riceText, 'any')).clear).toBe(true);
    expect((await aboveConfidence.match(riceText, 'any')).clear).toBe(false);
  }, 60_000);

  it('keeps the crop filter: a corn answer never returns a rice problem', async () => {
    const r = await atConfidence.match(riceText, 'corn');
    expect(r.ids.length).toBeGreaterThan(0);
    for (const id of r.ids) expect(cropOf.get(id), id).toBe('corn');
  }, 60_000);

  it('gives the same answer for the same text', async () => {
    const a = await atConfidence.match(riceText, 'any');
    const b = await atConfidence.match(riceText, 'any');
    expect(b).toEqual(a);
  }, 60_000);
});
