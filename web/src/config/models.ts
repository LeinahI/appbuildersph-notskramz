/**
 * Phone AI model. This is the only place to change the model, dtype, or device.
 *
 * Loader: Gemma4ForCausalLM with AutoProcessor, text-only. Chosen by the team. It is a
 * Gemma 4 class from the same model card, not the generic pipeline. The card's
 * Gemma4ForConditionalGeneration also downloads vision and audio graphs. See README.
 */
export const PHONE_MODEL = {
  id: 'onnx-community/gemma-4-E2B-it-ONNX',
  dtype: 'q4f16',
  device: 'webgpu',
  fallbackDevice: 'wasm',
} as const;
