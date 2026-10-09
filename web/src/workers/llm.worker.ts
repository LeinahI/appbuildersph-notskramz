/// <reference lib="webworker" />
// Phone AI. Runs in a Web Worker so the screen stays responsive during generation.
// Loader: the model card's Gemma4ForConditionalGeneration with AutoProcessor, so the phone reads photos itself
// (about 3.4 GB at q4f16: embed, decoder, and the vision and audio graphs). The text-only Gemma4ForCausalLM
// (about 3.1 GB) could not read a photo. A photo goes through the same form the hub uses (buildPhotoMessages).
// Device: WebGPU first, then WebAssembly if that fails.
// Local only: the weights come from the hub over the Wi-Fi and the ONNX runtime from this app's server. Nothing is
// fetched from Hugging Face or a CDN. Transformers.js keeps both in the browser cache, so later loads need no network.
import { AutoProcessor, Gemma4ForConditionalGeneration, RawImage, TextStreamer, env } from '@huggingface/transformers';
import type { ChatMessage } from '@ugatan/shared';
import { PHONE_MODEL } from '../config/models';

type Inbound =
  | { type: 'load'; hubUrl: string }
  | { type: 'generate'; id: number; messages: ChatMessage[]; maxNewTokens?: number; image?: string };

/** Points Transformers.js at the hub for weights and at this app's /ort/ for the runtime, before anything loads. */
function useLocalSources(hubUrl: string) {
  // The hub is the "remote" host: it serves /models/<repo>/<file>, the layout of a Hugging Face mirror.
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  env.remoteHost = `${hubUrl}/models/`;
  env.remotePathTemplate = '{model}/';
  // Transformers.js sets jsDelivr URLs for the runtime when it loads. Keep the build it chose, from this app instead.
  const wasm = (env.backends.onnx as { wasm?: { wasmPaths?: unknown } }).wasm;
  const ort = new URL(`${import.meta.env.BASE_URL}ort/`, self.location.origin).href;
  const local = (url: string) => ort + url.slice(url.lastIndexOf('/') + 1);
  const paths = wasm?.wasmPaths;
  if (wasm && paths && typeof paths === 'object' && 'wasm' in paths && 'mjs' in paths) {
    wasm.wasmPaths = { wasm: local(String(paths.wasm)), mjs: local(String(paths.mjs)) };
  } else if (wasm) {
    wasm.wasmPaths = ort;
  }
}

let processor: any = null;
let model: any = null;

function post(type: 'progress' | 'ready' | 'done' | 'error', data?: unknown, id?: number) {
  self.postMessage({ type, data, id });
}

async function loadOn(device: 'webgpu' | 'wasm') {
  processor = await AutoProcessor.from_pretrained(PHONE_MODEL.id);
  model = await Gemma4ForConditionalGeneration.from_pretrained(PHONE_MODEL.id, {
    dtype: PHONE_MODEL.dtype,
    device,
    progress_callback: (info: unknown) => post('progress', info),
  });
}

async function load(hubUrl: string) {
  useLocalSources(hubUrl);
  try {
    await loadOn(PHONE_MODEL.device);
    post('ready', PHONE_MODEL.device);
  } catch {
    // WebGPU unavailable or failed. Fall back to the CPU. Slower, same guardrails.
    await loadOn(PHONE_MODEL.fallbackDevice);
    post('ready', PHONE_MODEL.fallbackDevice);
  }
}

async function generate(id: number, messages: ChatMessage[], maxNewTokens = 260, image?: string) {
  if (image) {
    post('done', await readPhoto(messages, maxNewTokens, image), id);
    return;
  }
  const prompt = processor.apply_chat_template(messages, {
    enable_thinking: false,
    add_generation_prompt: true,
  });
  // Text-only input: tokenize the prompt directly. No image or audio is passed.
  const inputs = processor.tokenizer(prompt, { add_special_tokens: false });

  let text = '';
  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (chunk: string) => {
      text += chunk;
    },
  });
  await model.generate({ ...inputs, max_new_tokens: maxNewTokens, do_sample: false, streamer });
  // The main thread runs the pesticide guardrail before anything is shown.
  post('done', text, id);
}

/** One photo question: the photo goes before the text in the user turn, as the hub sends it. */
async function readPhoto(messages: ChatMessage[], maxNewTokens: number, image: string): Promise<string> {
  const [system, user] = messages;
  const chat = [
    { role: 'system', content: system!.content },
    { role: 'user', content: [{ type: 'image' }, { type: 'text', text: user!.content }] },
  ];
  const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
  const photo = await RawImage.fromBlob(new Blob([bytes], { type: 'image/jpeg' }));
  const prompt = processor.apply_chat_template(chat, { enable_thinking: false, add_generation_prompt: true });
  // The call is processor(text, images, audio, options).
  const inputs = await processor(prompt, photo, null, { add_special_tokens: false });
  const output = await model.generate({ ...inputs, max_new_tokens: maxNewTokens, do_sample: false });
  const promptLength = inputs.input_ids.dims[1];
  const [decoded] = processor.tokenizer.batch_decode(output.slice(null, [promptLength, null]), { skip_special_tokens: true });
  return String(decoded ?? '').trim();
}

self.onmessage = async (e: MessageEvent<Inbound>) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') {
      await load(msg.hubUrl);
    } else if (msg.type === 'generate') {
      if (!model) throw new Error('Model not loaded yet.');
      await generate(msg.id, msg.messages, msg.maxNewTokens, msg.image);
    }
  } catch (err) {
    post('error', err instanceof Error ? err.message : String(err), msg.type === 'generate' ? msg.id : undefined);
  }
};
