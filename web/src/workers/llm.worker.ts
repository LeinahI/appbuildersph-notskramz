/// <reference lib="webworker" />
// Phone AI. Runs in a Web Worker so the screen stays responsive during generation.
// Loader: the Gemma 4 loader from the model card (AutoProcessor + Gemma4ForConditionalGeneration).
// Device: WebGPU first, then WebAssembly on the CPU if that fails.
import { AutoProcessor, Gemma4ForConditionalGeneration, TextStreamer } from '@huggingface/transformers';
import type { ChatMessage } from '@ugatan/shared';
import { PHONE_MODEL } from '../config/models';

type Inbound = { type: 'load' } | { type: 'generate'; id: number; messages: ChatMessage[] };

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

async function load() {
  try {
    await loadOn(PHONE_MODEL.device);
    post('ready', PHONE_MODEL.device);
  } catch {
    // WebGPU unavailable or failed. Fall back to the CPU. Slower, same guardrails.
    await loadOn(PHONE_MODEL.fallbackDevice);
    post('ready', PHONE_MODEL.fallbackDevice);
  }
}

async function generate(id: number, messages: ChatMessage[]) {
  const prompt = processor.apply_chat_template(messages, {
    enable_thinking: false,
    add_generation_prompt: true,
  });
  // Text-only input: no image and no audio.
  const inputs = await processor(prompt, null, null, { add_special_tokens: false });

  let text = '';
  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (chunk: string) => {
      text += chunk;
    },
  });
  await model.generate({ ...inputs, max_new_tokens: 260, do_sample: false, streamer });
  // The main thread runs the pesticide guardrail before anything is shown.
  post('done', text, id);
}

self.onmessage = async (e: MessageEvent<Inbound>) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') {
      await load();
    } else if (msg.type === 'generate') {
      if (!model) throw new Error('Model not loaded yet.');
      await generate(msg.id, msg.messages);
    }
  } catch (err) {
    post('error', err instanceof Error ? err.message : String(err), msg.type === 'generate' ? msg.id : undefined);
  }
};
