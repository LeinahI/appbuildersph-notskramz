import { basename, dirname } from 'node:path';
import { buildMessages } from '@ugatan/shared';
import type { ExplainInput, ExplainResult, Explainer } from './index.js';
import { oneAtATime } from './queue.js';

export interface GemmaExplainerOptions {
  /** Local Gemma 4 ONNX folder, for example E:/models/gemma-4-E2B-it-ONNX. Nothing is downloaded. */
  modelDir: string;
  /** ONNX weight variant. q4f16 is the smallest that runs on the CPU. */
  dtype: string;
  /** onnxruntime device. "cpu" is the tested route. */
  device: string;
  /** Cap on the generated answer. */
  maxNewTokens: number;
  /** Word limit the prompt asks for. */
  maxWords: number;
}

/** An answer that hit the token cap ends mid-sentence. Cut it back to the last full sentence or step. */
export function trimToSentence(text: string): string {
  const full = text.trim();
  if (/[.!?]$/.test(full)) return full;
  const keep = (end: number): string | null => (end > full.length / 3 ? full.slice(0, end).trim() : null);
  // Drop the unfinished last line first, so a list marker like "3." is never mistaken for a sentence end.
  const lastLine = full.lastIndexOf('\n');
  if (lastLine > 0) {
    const dropped = keep(lastLine);
    if (dropped) return dropped;
  }
  // One line only: cut at the last sentence end followed by a space.
  const ends = [...full.matchAll(/[.!?](?=\s)/g)];
  const lastEnd = ends.length ? ends[ends.length - 1]!.index! + 1 : 0;
  return keep(lastEnd) ?? full;
}

/**
 * Taglish explanation from a local Gemma 4 ONNX model on the CPU, text only. Slower than the llama.cpp route
 * (gemma-llamacpp.ts); kept for hubs without a usable GPU. Same prompt as the phone model
 * (buildMessages in shared). The hub still runs the pesticide guardrail on the result.
 *
 * Tested route (Gemma 4 E2B, Node 24, Windows): device cpu with dtype q4f16 or q4. DirectML on the
 * GPU loads but produced empty output, so it is not the default.
 */
export async function createGemmaExplainer(opts: GemmaExplainerOptions): Promise<Explainer> {
  // Imported here so a hub that never uses Gemma does not load onnxruntime for it.
  const { env, AutoProcessor, Gemma4ForCausalLM } = await import('@huggingface/transformers');
  env.allowRemoteModels = false;
  env.localModelPath = dirname(opts.modelDir) + '/';
  const modelId = basename(opts.modelDir);

  // transformers.js types do not cover the Gemma 4 chat template options or tensor slicing. The phone worker uses any too.
  const processor: any = await AutoProcessor.from_pretrained(modelId);
  const model: any = await Gemma4ForCausalLM.from_pretrained(modelId, {
    dtype: opts.dtype as never,
    device: opts.device as never,
  });

  const enqueue = oneAtATime();

  async function generate({ text, crop, entries, clear }: ExplainInput): Promise<string> {
    const messages = buildMessages(text, crop, entries, { maxWords: opts.maxWords, sure: clear });
    const prompt = processor.apply_chat_template(messages, {
      enable_thinking: false,
      add_generation_prompt: true,
    });
    const inputs = processor.tokenizer(prompt, { add_special_tokens: false });
    const output = await model.generate({
      ...inputs,
      max_new_tokens: opts.maxNewTokens,
      do_sample: false,
    });
    const promptLength = inputs.input_ids.dims[1];
    const generated: number = output.dims[1] - promptLength;
    const [decoded] = processor.tokenizer.batch_decode(output.slice(null, [promptLength, null]), {
      skip_special_tokens: true,
    });
    const answer = (decoded ?? '').trim();
    return generated >= opts.maxNewTokens ? trimToSentence(answer) : answer;
  }

  return {
    name: 'gemma',
    async explain(input): Promise<ExplainResult> {
      const text = await enqueue(() => generate(input));
      return text ? { status: 'ok', text } : { status: 'unavailable', text: null };
    },
  };
}
