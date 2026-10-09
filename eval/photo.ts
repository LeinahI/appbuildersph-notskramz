// Scores the hub's photo reading on labeled photos: does it read the plant, and does the match find the problem?
// Run from the hub folder:
//   pnpm eval:photo                      reads every photo with the vision model (slow), then scores
//   pnpm eval:photo -- --score <file>    scores saved answers again, with no model run (seconds)
//   pnpm eval:photo -- --only fall-armyworm,corn-aphid    reads only these labels
//   pnpm eval:photo -- --resume <file>   reads only the photos missing from a saved run, and adds them to it
//   pnpm eval:photo -- --score <file> --crop prefer       how the photo's plant is used: photo, any, or prefer
//   pnpm eval:photo -- --score <file> --sure off          the photo-only "sure" rule: two-signs (default), keywords, or off
//
// Photos and labels: eval/photos/ (Wikimedia Commons, see eval/photos/CREDITS.md). Each run saves the vision model's
// raw answers to eval/results/photo-<time>.jsonl, so a change to the photo form reader or the matcher can be scored
// without reading the photos again. Needs GEMMA_MODEL_DIR and LAYA_MODEL_DIR in hub/.env. Expect 30 to 150 s a photo.
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cropOfChat } from '../shared/src/crop.js';
import { matchKeywords } from '../shared/src/keyword.js';
import { photoIsSure, photoSignsOf } from '../shared/src/photo-form.js';
import type { KnowledgeEntry } from '../shared/src/types.js';
import { loadConfig } from '../hub/src/config.js';
import { loadEnvFile } from '../hub/src/env.js';
import { createGemmaMultimodal } from '../hub/src/explain/multimodal.js';
import { loadKnowledge } from '../hub/src/knowledge.js';
import { createHybridMatcher } from '../hub/src/matchers/hybrid.js';
import { createKeywordMatcher } from '../hub/src/matchers/keyword.js';
import { createLayaMatcher } from '../hub/src/matchers/laya.js';

const flag = (name: string): string | null => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? null) : null;
};

/** What the farmer types with the photo. The user's real report was this. */
const NOTE = 'ano ang mali';

interface Photo {
  file: string;
  label: string;
  crop: 'rice' | 'corn' | 'none';
}
interface Raw {
  file: string;
  label: string;
  crop: Photo['crop'];
  raw: string | null;
  ms: number;
}

const dir = resolve('../eval/photos');
const photos: Photo[] = readFileSync(join(dir, 'labels.csv'), 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    const [file, label, crop] = line.split(',');
    return { file: file!, label: label!, crop: crop as Photo['crop'] };
  });

loadEnvFile();
const config = loadConfig();
const knowledge: KnowledgeEntry[] = loadKnowledge(new URL('../knowledge/', import.meta.url));
const ids = new Set(knowledge.map((e) => e.id));

let raws: Raw[];
const saved = flag('score');
if (saved) {
  raws = readFileSync(resolve(saved), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Raw);
} else {
  if (!config.gemmaModelDir) throw new Error('Set GEMMA_MODEL_DIR (the Gemma 4 ONNX folder) in hub/.env.');
  const only = flag('only')?.split(',');
  const vision = createGemmaMultimodal({
    modelDir: config.gemmaModelDir,
    dtype: config.multimodalDtype,
    device: config.gemmaDevice,
    imageMaxNewTokens: config.visionMaxNewTokens,
    audioMaxNewTokens: 64,
  });
  mkdirSync(resolve('../eval/results'), { recursive: true });
  const resume = flag('resume');
  const out = resume ? resolve(resume) : resolve(`../eval/results/photo-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
  raws = resume ? readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Raw) : [];
  if (!resume) writeFileSync(out, '');
  const done = new Set(raws.map((r) => r.file));
  for (const p of photos.filter((p) => (!only || only.includes(p.label)) && !done.has(p.file))) {
    const started = Date.now();
    const bytes = new Uint8Array(readFileSync(join(dir, p.file)));
    let raw: string | null;
    try {
      raw = await vision.describeImage(bytes, NOTE, 'any');
    } catch (err) {
      // Usually memory taken by another process for a moment. One retry after a pause.
      console.log(`${p.file}: ${err instanceof Error ? err.message.slice(0, 80) : err}; trying again in 30 s`);
      await new Promise((r) => setTimeout(r, 30_000));
      raw = await vision.describeImage(bytes, NOTE, 'any');
    }
    const row: Raw = { ...p, raw, ms: Date.now() - started };
    raws.push(row);
    appendFileSync(out, `${JSON.stringify(row)}\n`);
    console.log(`${p.file.padEnd(28)} ${Math.round(row.ms / 1000)} s  ${(raw ?? '').replace(/\s+/g, ' ').slice(0, 110)}`);
  }
  console.log(`\nSaved raw answers to ${out}`);
}

// Matching as the hub does it for a photo: the farmer's note with the photo's signs, crop read from them, keyword
// first, Laya when keyword is not sure.
const laya = await createLayaMatcher(knowledge, {
  cacheDir: config.layaCache,
  modelDir: config.layaModelDir,
  confidenceThreshold: config.layaConfidenceThreshold,
  device: config.layaDevice,
});
const matcher = createHybridMatcher(createKeywordMatcher(knowledge), laya);

/**
 * How the plant the photo shows is used (--crop): "photo" matches only that crop's problems, "any" ignores it, and
 * "prefer" tries that crop first and matches across both crops when that is not sure.
 */
const cropMode = flag('crop') ?? 'photo';
async function matchFor(text: string, crop: 'rice' | 'corn' | 'any', picks: string[] | undefined) {
  const m = await matchCrop(text, crop);
  if (!m.clear || flag('sure') === 'off') return m;
  if (flag('sure') === 'keywords') {
    // Two keyword hits for the top problem and a clear lead (tried 2026-10-10, kept for comparison).
    const k = matchKeywords(text, crop === 'any' || cropMode === 'any' ? 'any' : crop, knowledge, 2);
    const [a, b] = k.matches;
    const strong = a && a.entry.id === m.ids[0] && a.score >= 2 && a.score > (b?.score ?? 0);
    return strong ? m : { ...m, clear: false };
  }
  // As the hub does it: a photo alone is sure only with two picked signs for the problem.
  return picks && !photoIsSure(m.ids[0]!, picks, knowledge) ? { ...m, clear: false } : m;
}
async function matchCrop(text: string, crop: 'rice' | 'corn' | 'any') {
  if (cropMode === 'any') return matcher.match(text, 'any');
  const first = await matcher.match(text, crop);
  if (cropMode === 'photo' || first.clear || crop === 'any') return first;
  const wide = await matcher.match(text, 'any');
  return wide.clear ? wide : first.ids.length ? first : wide;
}

let plantRight = 0;
let pests = 0;
let top1 = 0;
let top2 = 0;
let sureRight = 0;
let sureWrong = 0;
let emptyRight = 0;
let emptySure = 0;
let empties = 0;
console.log(`\n${'photo'.padEnd(28)}${'plant'.padEnd(8)}${'match'.padEnd(46)}result`);
for (const r of raws) {
  const outcome = photoSignsOf(r.raw);
  const text = outcome.kind === 'signs' ? `${NOTE}. ${outcome.english}` : NOTE;
  const crop = outcome.kind === 'signs' ? cropOfChat(text) : 'any';
  const readPlant = outcome.kind === 'not-plant' ? 'none' : crop === 'any' ? '?' : crop;
  if (readPlant === r.crop) plantRight++;

  let result: string;
  let match = '';
  if (ids.has(r.label)) {
    pests++;
    const m = outcome.kind === 'signs' ? await matchFor(text, crop, outcome.picks) : { ids: [] as string[], clear: false };
    match = `${m.ids.join(', ') || '-'}${m.clear ? ' (sure)' : ''}`;
    const first = m.ids[0] === r.label;
    if (first) top1++;
    if (m.ids.slice(0, 2).includes(r.label)) top2++;
    if (m.clear && first) sureRight++;
    if (m.clear && !first) sureWrong++;
    result = first ? (m.clear ? 'RIGHT, sure' : 'right, not sure') : m.ids.includes(r.label) ? 'second' : m.clear ? 'WRONG, sure' : 'miss';
  } else {
    // Healthy plants should give no signs; photos of other things should read as not rice or corn.
    empties++;
    const want = r.label === 'not-rice-or-corn' ? 'not-plant' : 'no-signs';
    const ok = outcome.kind === want;
    if (ok) emptyRight++;
    // When signs were read anyway, what the farmer would be told: a sure problem is the harm, a question is not.
    const m = outcome.kind === 'signs' ? await matchFor(text, crop, outcome.picks) : null;
    if (m?.clear) emptySure++;
    match = m ? `${m.ids.join(', ') || '-'}${m.clear ? ' (sure)' : ''}` : outcome.kind;
    result = ok ? 'right' : m?.clear ? `wanted ${want}, told a SURE problem` : `wanted ${want}, asked a question`;
  }
  console.log(`${r.file.padEnd(28)}${readPlant.padEnd(8)}${match.slice(0, 44).padEnd(46)}${result}`);
}

const pct = (n: number, d: number) => `${n}/${d} (${d ? Math.round((100 * n) / d) : 0}%)`;
console.log(`\nplant read right:           ${pct(plantRight, raws.length)}`);
console.log(`problem first:              ${pct(top1, pests)}`);
console.log(`problem in the top two:     ${pct(top2, pests)}`);
console.log(`sure and right:             ${pct(sureRight, pests)}`);
console.log(`sure and WRONG:             ${pct(sureWrong, pests)}`);
console.log(`healthy or other, right:    ${pct(emptyRight, empties)}`);
console.log(`healthy or other, SURE:     ${pct(emptySure, empties)}`);
const times = raws.map((r) => r.ms).filter((ms) => ms > 0);
if (times.length) console.log(`seconds a photo:            median ${Math.round(times.sort((a, b) => a - b)[Math.floor(times.length / 2)]! / 1000)}`);
process.exit(0);
