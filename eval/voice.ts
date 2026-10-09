// Scores the hub's speech writing on real recordings: word and character error rate per language.
// Run from the hub folder: pnpm eval:voice [-- --dir ../eval/voice-clips] [--per-language 4] [--dtype quantized] [--audio-dtype fp32]
//
// Get clips first (about 25 MB each, Google FLEURS, CC-BY-4.0, read speech with the correct text):
//   python -I eval/fetch-fleurs.py eval/voice-clips fil_ph 25000000
//   python -I eval/fetch-fleurs.py eval/voice-clips ceb_ph 25000000
// FLEURS is read Wikipedia sentences, not farm talk, so it shows how well the model hears each language,
// not how it does on farm words. Real farmers' recordings with the correct text belong here too.
// Needs GEMMA_MODEL_DIR in hub/.env. The model runs on the CPU, so expect 20 to 60 s a clip.
import { appendFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { transcriptText } from '../shared/src/prompt.js';
import { loadConfig } from '../hub/src/config.js';
import { loadEnvFile } from '../hub/src/env.js';
import { createGemmaMultimodal } from '../hub/src/explain/multimodal.js';
import { errorCounts } from './lib/wer.js';

const LANGUAGES: Record<string, string> = { fil_ph: 'Tagalog (Filipino)', ceb_ph: 'Cebuano' };
const flag = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};

/** Samples of a 16 kHz mono WAV, 16-bit integer or 32-bit float. */
function readWav(path: string): Float32Array {
  const wav = readFileSync(path);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let offset = 12;
  let format: { tag: number; channels: number; rate: number; bits: number } | null = null;
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ') {
      format = {
        tag: view.getUint16(offset + 8, true),
        channels: view.getUint16(offset + 10, true),
        rate: view.getUint32(offset + 12, true),
        bits: view.getUint16(offset + 22, true),
      };
    }
    if (id === 'data' && format) {
      if (format.rate !== 16000 || format.channels !== 1) throw new Error(`${path}: needs 16 kHz mono, got ${JSON.stringify(format)}`);
      const bytes = format.bits / 8;
      const count = Math.floor(Math.min(size, wav.length - offset - 8) / bytes);
      const out = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const at = offset + 8 + i * bytes;
        out[i] = format.tag === 3 ? view.getFloat32(at, true) : view.getInt16(at, true) / 32768;
      }
      return out;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`${path}: not a WAV file`);
}

loadEnvFile();
const config = loadConfig();
if (!config.gemmaModelDir) throw new Error('Set GEMMA_MODEL_DIR (the Gemma 4 ONNX folder) in hub/.env.');
const dir = resolve(flag('dir', '../eval/voice-clips'));
const perLanguage = Number(flag('per-language', '4'));
const dtype = flag('dtype', config.multimodalDtype);
const audioDtype = flag('audio-dtype', config.audioDtype ?? '');

const model = createGemmaMultimodal({
  modelDir: config.gemmaModelDir,
  dtype,
  audioDtype: audioDtype || undefined,
  device: config.gemmaDevice,
  imageMaxNewTokens: config.visionMaxNewTokens,
  audioMaxNewTokens: config.voiceMaxNewTokens,
});
console.log(`weights: ${dtype}${audioDtype ? `, audio encoder ${audioDtype}` : ''}. Loading the model...`);
if (!(await model.preload())) throw new Error('The model did not load.');

mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const resultFile = new URL(`./results/voice-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`, import.meta.url);
const totals: Record<string, { wordErrors: number; words: number; charErrors: number; chars: number; clips: number; seconds: number }> = {};

for (const [code, name] of Object.entries(LANGUAGES)) {
  const folder = join(dir, code);
  let files: Set<string>;
  try {
    files = new Set(readdirSync(folder));
  } catch {
    console.log(`${name}: no clips in ${folder}, skipped.`);
    continue;
  }
  // FLEURS dev.tsv columns: id, file name, raw text, text, phonemes, sample count, gender.
  const rows = readFileSync(join(folder, 'dev.tsv'), 'utf8')
    .split('\n')
    .map((line) => line.split('\t'));
  const clips = rows.filter((r) => r[1] && files.has(r[1]) && Number(r[5]) <= 16000 * 12).slice(0, perLanguage);
  for (const row of clips) {
    const started = Date.now();
    const samples = readWav(join(folder, row[1]!));
    const hypothesis = transcriptText(await model.transcribe(samples)) ?? '';
    const counts = errorCounts(row[3]!, hypothesis);
    const seconds = (Date.now() - started) / 1000;
    const t = (totals[name] ??= { wordErrors: 0, words: 0, charErrors: 0, chars: 0, clips: 0, seconds: 0 });
    t.wordErrors += counts.wordErrors;
    t.words += counts.words;
    t.charErrors += counts.charErrors;
    t.chars += counts.chars;
    t.clips++;
    t.seconds += seconds;
    appendFileSync(resultFile, `${JSON.stringify({ language: name, file: row[1], dtype, audioDtype, seconds, reference: row[3], hypothesis, ...counts })}\n`);
    console.log(`${name} ${row[1]} word errors ${counts.wordErrors}/${counts.words}, character errors ${counts.charErrors}/${counts.chars}, ${seconds.toFixed(0)} s`);
  }
}

console.log('\nLanguage             clips  word error  character error  seconds per clip');
for (const [name, t] of Object.entries(totals)) {
  const pct = (a: number, b: number) => ((100 * a) / b).toFixed(1);
  console.log(`${name.padEnd(20)} ${String(t.clips).padStart(5)}  ${pct(t.wordErrors, t.words).padStart(9)}%  ${pct(t.charErrors, t.chars).padStart(14)}%  ${(t.seconds / t.clips).toFixed(0).padStart(16)}`);
}
console.log(`Results: ${resultFile.pathname}`);
