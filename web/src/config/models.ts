/**
 * Phone AI model. This is the only place to change the model, dtype, or device.
 *
 * Loader: the Gemma 4 loader shown on the model card (AutoProcessor +
 * Gemma4ForConditionalGeneration), not the generic pipeline. Pending decision:
 * whether to trim the vision and audio encoders for text-only use. See docs/DISCLOSURE.md.
 */
export const PHONE_MODEL = {
  id: 'onnx-community/gemma-4-E2B-it-ONNX',
  dtype: 'q4f16',
  device: 'webgpu',
  fallbackDevice: 'wasm',
} as const;
