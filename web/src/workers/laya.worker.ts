/// <reference lib="webworker" />
// Laya on the phone. Runs in its own Web Worker, beside the Gemma worker, so matching never blocks the screen.
// Local only: the bundle (about 1.69 GB, fp32) comes from the hub over its Wi-Fi (/models/laya/) and is kept in the
// browser's Cache Storage, so later loads need no network. The ONNX runtime comes from this app's /ort/.
// Device: WebGPU first, then WebAssembly on the CPU, as on the hub.
import { Tokenizer } from '@huggingface/tokenizers';
import * as ort from 'onnxruntime-web/webgpu';
import { PHONE_LAYA_PATH } from '@ugatan/shared';
import { buildChoiceSequence, choiceInputs, readChoice, type LayaConfig, type SpecialIds } from '../lib/laya-sequence';

type Inbound =
  | { type: 'load'; hubUrl: string }
  | { type: 'ask'; id: number; description: string; instructions: string; options: string[] };

const CACHE = 'ugatan-laya-v1';
const FILES = ['laya_config.json', 'tokenizer/tokenizer.json', 'tokenizer/tokenizer_config.json', 'laya.onnx', 'laya.onnx.data'];

let session: ort.InferenceSession | null = null;
let tokenizer: Tokenizer | null = null;
let config: LayaConfig | null = null;
let ids: SpecialIds | null = null;

function post(type: 'progress' | 'ready' | 'done' | 'error', data?: unknown, id?: number) {
  self.postMessage({ type, data, id });
}

/** The same runtime build Transformers.js picks, from this app's /ort/ instead of a CDN. */
function useLocalRuntime() {
  const base = new URL(`${import.meta.env.BASE_URL}ort/`, self.location.origin).href;
  ort.env.wasm.wasmPaths = {
    mjs: `${base}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${base}ort-wasm-simd-threaded.asyncify.wasm`,
  };
}

/** A bundle file from the browser cache, or from the hub once, with download progress for the big file. */
async function cachedFile(hubUrl: string, name: string): Promise<Response> {
  const url = `${hubUrl}/models/${PHONE_LAYA_PATH}/${name}`;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Hub returned ${res.status} for ${name}`);
  const size = Number(res.headers.get('content-length') ?? 0);
  let loaded = 0;
  let lastPercent = -1;
  // Counted on the way into the cache, so the 1.69 GB file is written to disk without being held twice in memory.
  const counted = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.byteLength;
        const percent = size ? Math.floor((loaded / size) * 100) : 0;
        if (percent !== lastPercent) {
          lastPercent = percent;
          post('progress', { file: name, progress: percent });
        }
        controller.enqueue(chunk);
      },
    }),
  );
  try {
    await cache.put(url, new Response(counted, { headers: res.headers }));
    const stored = await cache.match(url);
    if (stored) return stored;
  } catch {
    // The browser would not keep it, most often because the phone is low on storage.
  }
  // Load it from the hub without keeping it: Laya works now, and is downloaded again next time.
  post('progress', { status: `Hindi maitabi ang ${name} sa cellphone (kulang ang espasyo). Kailangan ulit ang hub sa susunod.` });
  const direct = await fetch(url);
  if (!direct.ok) throw new Error(`Hub returned ${direct.status} for ${name}`);
  return direct;
}

async function load(hubUrl: string) {
  useLocalRuntime();
  const [cfg, tokJson, tokConfig, model, data] = await Promise.all(FILES.map((f) => cachedFile(hubUrl, f)));
  config = (await cfg!.json()) as LayaConfig;
  tokenizer = new Tokenizer(await tokJson!.json(), await tokConfig!.json());
  const id = (t: string) => {
    const v = tokenizer!.token_to_id(t);
    if (v === undefined) throw new Error(`special token ${t} missing from tokenizer`);
    return v;
  };
  ids = { cls: id('[CLS]'), sep: id('[SEP]'), mask: id('[MASK]'), pad: id('[PAD]'), maskTok: '[MASK]' };
  post('progress', { status: 'Inihahanda ang Laya...' });
  const modelBytes = new Uint8Array(await model!.arrayBuffer());
  const dataBytes = new Uint8Array(await data!.arrayBuffer());
  for (const device of ['webgpu', 'wasm'] as const) {
    try {
      session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: [device],
        graphOptimizationLevel: 'all',
        externalData: [{ path: 'laya.onnx.data', data: dataBytes }],
        logSeverityLevel: 3,
      });
      post('ready', device);
      return;
    } catch (err) {
      if (device === 'wasm') throw err;
      // WebGPU unavailable or failed. Fall back to the CPU. Slower, same answers.
    }
  }
}

async function ask(id: number, description: string, instructions: string, options: string[]) {
  if (!session || !tokenizer || !config || !ids) throw new Error('Laya is not loaded yet.');
  const encode = (text: string) => tokenizer!.encode(text, { add_special_tokens: false }).ids;
  const seq = buildChoiceSequence(encode, ids, { description }, instructions, options, config.max_len, config.head_max_len);
  if (seq.markers.length !== seq.options.length) {
    throw new Error(`options do not fit in head_max_len=${config.head_max_len} tokens`);
  }
  const inputs = choiceInputs(seq.ids, seq.markers);
  const out = await session.run({
    input_ids: new ort.Tensor('int64', inputs.input_ids.data, inputs.input_ids.dims),
    attention_mask: new ort.Tensor('int64', inputs.attention_mask.data, inputs.attention_mask.dims),
    marker_pos: new ort.Tensor('int64', inputs.marker_pos.data, inputs.marker_pos.dims),
    marker_mask: new ort.Tensor('bool', inputs.marker_mask.data, inputs.marker_mask.dims),
    qtype: new ort.Tensor('int64', inputs.qtype.data, inputs.qtype.dims),
  });
  const logits = out['logits']?.data;
  if (!(logits instanceof Float32Array)) throw new Error('unexpected model output (expected float32 logits)');
  const { probabilities, confidence } = readChoice(logits, seq.options.length, config);
  post('done', { options: seq.options, probabilities, confidence }, id);
}

self.onmessage = async (e: MessageEvent<Inbound>) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') await load(msg.hubUrl);
    else if (msg.type === 'ask') await ask(msg.id, msg.description, msg.instructions, msg.options);
  } catch (err) {
    post('error', err instanceof Error ? err.message : String(err), msg.type === 'ask' ? msg.id : undefined);
  }
};
