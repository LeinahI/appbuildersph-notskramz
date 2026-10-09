import { basename, dirname } from 'node:path';
import { NO_SIGNS, OTHER_CROP, TRANSCRIBE_PROMPT, buildPhotoMessages, readPhotoForm } from '@ugatan/shared';
import type { AudioTranscriber, ImageDescriber } from './index.js';
import { oneAtATime } from './queue.js';

export interface GemmaMultimodalOptions {
  /** Local Gemma 4 ONNX folder, the same one the ONNX text route uses. Nothing is downloaded. */
  modelDir: string;
  /** ONNX weight variant. q4f16 is the smallest that runs on the CPU. */
  dtype: string;
  /** onnxruntime device. "cpu" is the tested route. */
  device: string;
  /**
   * ONNX weight variant for the audio encoder alone, when it should differ from `dtype`. The audio encoder is small, so
   * a more exact variant costs little memory, and 4-bit weights lose detail in the sound that the text model cannot get back.
   */
  audioDtype?: string;
  /** Cap on the filled-in photo form. Eleven short lines fit inside it. */
  imageMaxNewTokens: number;
  /** Cap on a transcript. 30 seconds of speech is at most about 100 words. */
  audioMaxNewTokens: number;
}

export interface GemmaMultimodal extends ImageDescriber, AudioTranscriber {
  /** Starts loading the model now, so the first photo or recording does not wait for it. Never rejects. */
  preload(): Promise<boolean>;
}

/**
 * Photo and speech reading from the local Gemma 4 ONNX model (text, vision encoder, audio encoder, and decoder) on
 * the CPU. The llama.cpp route cannot do this: its GGUF has no vision or audio projector file and node-llama-cpp
 * 3.22 has no image or audio input. About 30 s per photo and 26 s for a 6 s recording on the dev laptop (measured
 * 2026-10-09, see docs/agent-notes/).
 *
 * One model instance serves both jobs, one at a time. It loads on first use, or earlier through preload(), and stays
 * in memory. A failed load is reported to that caller and tried again on the next one.
 */
export function createGemmaMultimodal(opts: GemmaMultimodalOptions): GemmaMultimodal {
  const enqueue = oneAtATime();
  let loading: Promise<{ processor: any; model: any; load_image: (blob: Blob) => Promise<unknown> }> | null = null;

  function load() {
    loading ??= (async () => {
      // Imported here so a hub without photo or speech reading never loads onnxruntime for it.
      const { env, AutoProcessor, Gemma4ForConditionalGeneration, load_image } = await import('@huggingface/transformers');
      env.allowRemoteModels = false;
      env.localModelPath = dirname(opts.modelDir) + '/';
      const modelId = basename(opts.modelDir);
      // transformers.js types do not cover the Gemma 4 processor call or tensor slicing. The text route uses any too.
      const processor: any = await AutoProcessor.from_pretrained(modelId);
      // transformers.js takes one variant for the whole model, or one per part.
      const dtype = opts.audioDtype
        ? { audio_encoder: opts.audioDtype, vision_encoder: opts.dtype, embed_tokens: opts.dtype, decoder_model_merged: opts.dtype }
        : opts.dtype;
      const model: any = await Gemma4ForConditionalGeneration.from_pretrained(modelId, {
        dtype: dtype as never,
        device: opts.device as never,
      });
      return { processor, model, load_image: load_image as (blob: Blob) => Promise<unknown> };
    })().catch((err) => {
      // Try again on the next call instead of keeping a failed load forever.
      loading = null;
      throw err;
    });
    return loading;
  }

  /** Runs one prompt with an optional photo or recording and returns the generated text. */
  async function generate(
    messages: unknown[],
    media: { image?: unknown; audio?: Float32Array },
    maxNewTokens: number,
  ): Promise<string | null> {
    const { processor, model } = await load();
    const prompt = processor.apply_chat_template(messages, { enable_thinking: false, add_generation_prompt: true });
    // The call is processor(text, images, audio, options).
    const inputs = await processor(prompt, media.image ?? null, media.audio ?? null, { add_special_tokens: false });
    const output = await model.generate({ ...inputs, max_new_tokens: maxNewTokens, do_sample: false });
    const promptLength = inputs.input_ids.dims[1];
    const [decoded] = processor.tokenizer.batch_decode(output.slice(null, [promptLength, null]), { skip_special_tokens: true });
    return (decoded ?? '').trim() || null;
  }

  async function describeImage(image: Uint8Array, note: string, crop: string): Promise<string | null> {
    const { load_image } = await load();
    const [system, user] = buildPhotoMessages(note, crop);
    const messages = [
      { role: 'system', content: system!.content },
      { role: 'user', content: [{ type: 'image' }, { type: 'text', text: user!.content }] },
    ];
    const photo = await load_image(new Blob([image], { type: 'image/jpeg' }));
    const raw = await generate(messages, { image: photo }, opts.imageMaxNewTokens);
    // The model fills in a form, and the description is written from its picks in the knowledge base's words.
    // An answer that is not a form is passed on as it is, and read as free text.
    const form = readPhotoForm(raw);
    if (!form) return raw;
    if (form.kind === 'not-plant') return OTHER_CROP;
    if (form.kind === 'no-signs') return NO_SIGNS;
    return form.english;
  }

  async function transcribe(samples: Float32Array): Promise<string | null> {
    // The audio goes before the text, as the model card asks.
    const messages = [{ role: 'user', content: [{ type: 'audio' }, { type: 'text', text: TRANSCRIBE_PROMPT }] }];
    return generate(messages, { audio: samples }, opts.audioMaxNewTokens);
  }

  return {
    name: 'gemma-multimodal',
    async preload() {
      try {
        await load();
        return true;
      } catch (err) {
        console.warn(`Photo and speech reading failed to load: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }
    },
    describeImage: (image, note, crop) => enqueue(() => describeImage(image, note, crop)),
    transcribe: (samples) => enqueue(() => transcribe(samples)),
  };
}
