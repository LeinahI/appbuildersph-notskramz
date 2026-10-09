/**
 * Measures real hub AI wall-clock timings and writes web/public/benchmarks.json.
 * Never invents numbers: missing models → exit 1, no overwrite with placeholders.
 *
 * Usage (from repo root): pnpm --filter @ugatan/hub benchmark:landing
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadEnvFile } from '../src/env.js';
import { loadConfig } from '../src/config.js';
import { loadKnowledge } from '../src/knowledge.js';
import { createKeywordMatcher } from '../src/matchers/keyword.js';
import { createGemmaLlamaCppExplainer } from '../src/explain/gemma-llamacpp.js';
import { createGemmaExplainer } from '../src/explain/gemma.js';
import { createGemmaMultimodal } from '../src/explain/multimodal.js';

type Item = { id: string; label: string; ms: number; detail: string };

const ASK = 'Nanilaw ang dahon ng palay';
const HUB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(HUB_ROOT, '../web/public/benchmarks.json');

/**
 * Machine label from `node-llama-cpp inspect gpu` (same CLI as
 * `npx node-llama-cpp inspect gpu` in hub/). Prefers Vulkan/CUDA device over CPU.
 */
function machineNoteFromInspectGpu(): string {
  try {
    // Same as `npx node-llama-cpp inspect gpu` in hub/. shell:true so Windows finds npx.cmd.
    const out = execFileSync('npx', ['node-llama-cpp', 'inspect', 'gpu'], {
      cwd: HUB_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    const vulkanOk = /^Vulkan:\s*available\s*$/im.test(out);
    const devicesLine = out.match(/^Vulkan devices:\s*(.+)$/im)?.[1]?.trim();
    if (vulkanOk && devicesLine) {
      const devices = devicesLine.split(',').map((d) => d.trim()).filter(Boolean);
      const preferred =
        devices.find((d) => /NVIDIA|GeForce|Radeon|\bAMD\b|Arc\b/i.test(d)) ?? devices[0]!;
      return `Vulkan · ${preferred}`;
    }
    const cuda = out.match(/^CUDA:\s*(.+)$/im)?.[1]?.trim();
    if (cuda && !/not\b|unavailable|missing/i.test(cuda)) {
      return `CUDA · ${cuda}`;
    }
    const cpu = out.match(/^CPU model:\s*(.+)$/im)?.[1]?.trim();
    if (cpu) return `CPU · ${cpu}`;
  } catch (err) {
    console.warn(`inspect gpu failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  const cpu = cpus()[0]?.model?.trim();
  return cpu ? `${platform()} · ${cpu}` : platform();
}

function assertPositiveMs(items: readonly Item[]): void {
  for (const item of items) {
    if (!Number.isFinite(item.ms) || item.ms <= 0) {
      throw new Error(`Refusing to write: ${item.id} has non-positive ms (${item.ms})`);
    }
  }
}

async function wallMs(fn: () => Promise<unknown>): Promise<number> {
  const t0 = performance.now();
  await fn();
  return performance.now() - t0;
}

/** Minimal 1×1 JPEG (with SOS) so vision can ingest bytes without a fixture file. */
function tinyJpeg(): Uint8Array {
  return Uint8Array.from(
    Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z',
      'base64',
    ),
  );
}

async function main(): Promise<void> {
  loadEnvFile();
  const config = loadConfig();

  const needGguf = config.gemmaRuntime === 'llamacpp';
  if (needGguf) {
    if (!config.gemmaGguf || !existsSync(config.gemmaGguf)) {
      console.error(
        'benchmark:landing needs GEMMA_GGUF (file must exist) for GEMMA_RUNTIME=llamacpp. ' +
          'Configure hub/.env, then retry. Not writing benchmarks.json.',
      );
      process.exit(1);
    }
  } else if (!config.gemmaModelDir || !existsSync(config.gemmaModelDir)) {
    console.error(
      'benchmark:landing needs GEMMA_MODEL_DIR (folder must exist) for GEMMA_RUNTIME=onnx. ' +
        'Configure hub/.env, then retry. Not writing benchmarks.json.',
    );
    process.exit(1);
  }

  const items: Item[] = [];
  const knowledge = loadKnowledge(new URL('../../knowledge/', import.meta.url));
  const keyword = createKeywordMatcher(knowledge);

  // Discard first match (cold JIT); report the second.
  await keyword.match(ASK, 'rice');
  const keywordMs = await wallMs(() => keyword.match(ASK, 'rice'));
  items.push({
    id: 'keyword_match',
    label: 'Keyword matcher',
    ms: Math.round(keywordMs * 100) / 100,
    detail: `Match-only for “${ASK}” (rice)`,
  });

  if (needGguf) {
    console.log('Loading Gemma GGUF (llama.cpp)…');
    const gemma = await createGemmaLlamaCppExplainer({
      modelPath: config.gemmaGguf!,
      maxNewTokens: config.gemmaMaxNewTokens,
      maxWords: config.gemmaMaxWords,
    });
    // createGemmaLlamaCppExplainer already warms the model.
    const explainMs = await wallMs(() =>
      gemma.explain({ text: ASK, crop: 'rice', entries: [], clear: false }),
    );
    items.push({
      id: 'explain_gguf',
      label: 'Gemma explain (GGUF Q4_0)',
      ms: Math.round(explainMs),
      detail: 'Short Taglish explain after load warm-up',
    });
  } else {
    console.log('Loading Gemma ONNX (text)…');
    const gemma = await createGemmaExplainer({
      modelDir: config.gemmaModelDir!,
      dtype: config.gemmaDtype,
      device: config.gemmaDevice,
      maxNewTokens: config.gemmaMaxNewTokens,
      maxWords: config.gemmaMaxWords,
    });
    await gemma.explain({ text: ASK, crop: 'rice', entries: [], clear: false });
    const explainMs = await wallMs(() =>
      gemma.explain({ text: ASK, crop: 'rice', entries: [], clear: false }),
    );
    items.push({
      id: 'explain_onnx',
      label: 'Gemma explain (ONNX)',
      ms: Math.round(explainMs),
      detail: 'Short Taglish explain after warm-up',
    });
  }

  if (config.vision && config.gemmaModelDir && existsSync(config.gemmaModelDir)) {
    console.log('Loading multimodal for photo…');
    const multimodal = createGemmaMultimodal({
      modelDir: config.gemmaModelDir,
      dtype: config.multimodalDtype,
      audioDtype: config.audioDtype ?? undefined,
      device: config.gemmaDevice,
      imageMaxNewTokens: Math.min(config.visionMaxNewTokens, 64),
      audioMaxNewTokens: config.voiceMaxNewTokens,
    });
    const ok = await multimodal.preload();
    if (ok) {
      const jpeg = tinyJpeg();
      try {
        await multimodal.describeImage(jpeg, '', 'rice');
        const photoMs = await wallMs(() => multimodal.describeImage(jpeg, '', 'rice'));
        items.push({
          id: 'photo_describe',
          label: 'Gemma photo describe (ONNX)',
          ms: Math.round(photoMs),
          detail: 'Tiny JPEG describe after warm-up',
        });
      } catch (err) {
        console.warn(`Skipping photo_describe: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (config.voice) {
        try {
          // ~0.5 s of silence at 16 kHz — enough to exercise the audio path.
          const pcm = new Float32Array(8000);
          await multimodal.transcribe(pcm);
          const voiceMs = await wallMs(() => multimodal.transcribe(pcm));
          items.push({
            id: 'voice_transcribe',
            label: 'Gemma voice transcribe (ONNX)',
            ms: Math.round(voiceMs),
            detail: 'Short PCM after warm-up',
          });
        } catch (err) {
          console.warn(`Skipping voice_transcribe: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } else {
      console.warn('Multimodal failed to load; omitting photo/voice timings.');
    }
  }

  assertPositiveMs(items);

  console.log('Reading GPU from node-llama-cpp inspect gpu…');
  const machineNote = machineNoteFromInspectGpu();
  const payload = {
    generatedAt: new Date().toISOString(),
    machineNote,
    status: 'ok' as const,
    items,
  };

  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${items.length} timing(s) to ${OUT}`);
  for (const item of items) console.log(`  ${item.id}: ${item.ms} ms`);
  // llama.cpp / onnxruntime keep native handles open; exit so the script does not hang.
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
