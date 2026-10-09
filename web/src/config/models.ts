import { PHONE_MODEL_REPO } from '@ugatan/shared';

/**
 * Phone AI model. This is the only place to change the model, dtype, or device.
 *
 * Local only: the weights come from the hub over the Wi-Fi (GET /models/<repo>/<file>), never from Hugging Face, and
 * the ONNX runtime comes from this app's own server (/ort/). See web/src/workers/llm.worker.ts.
 *
 * Loader: Gemma4ForCausalLM with AutoProcessor, text-only. Chosen by the team. It is a
 * Gemma 4 class from the same model card, not the generic pipeline. The card's
 * Gemma4ForConditionalGeneration also downloads vision and audio graphs. See README.
 */
export const PHONE_MODEL = {
  id: PHONE_MODEL_REPO,
  dtype: 'q4f16',
  device: 'webgpu',
  fallbackDevice: 'wasm',
  /**
   * Least device memory, in GB as the browser reports it (navigator.deviceMemory), to offer the download. The q4f16
   * weights are about 3.1 GB and are held in memory, so a 2 to 4 GB phone would close the tab. Chrome reports at most 8.
   */
  minMemoryGb: 8,
} as const;
