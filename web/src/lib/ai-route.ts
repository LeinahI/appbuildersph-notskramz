/**
 * Pick text + multimodal backends from hub proximity.
 *
 * - Away: phone LiteRT (.litertlm) for chat and on-device image/voice when native.
 * - On hub: browser ONNX for chat; hub handles image/voice (ONNX graphs) and text explain (GGUF Q4_0).
 * - Native on hub: send ask/photo/voice to the hub (Q4_0 explain + ONNX multimodal) rather than forcing ONNX in-app.
 */

export type AiTextBackend = 'litert' | 'onnx' | 'hub';
export type AiMultimodalBackend = 'phone-litert' | 'hub' | 'none';

export type AiRoute = {
  text: AiTextBackend;
  multimodal: AiMultimodalBackend;
};

export function resolveAiRoute(opts: { hubOnline: boolean; native: boolean }): AiRoute {
  if (opts.hubOnline) {
    return {
      text: opts.native ? 'hub' : 'onnx',
      multimodal: 'hub',
    };
  }
  return {
    text: opts.native ? 'litert' : 'onnx',
    multimodal: opts.native ? 'phone-litert' : 'none',
  };
}

/** True when the ask should go to the hub `/ask` path (queued sync) instead of answering only on the phone. */
export function preferHubAsk(route: AiRoute, hasImage: boolean, phoneReady: boolean): boolean {
  if (route.text === 'hub') return true;
  if (hasImage && route.multimodal === 'hub') return true;
  if (!phoneReady && route.multimodal === 'hub') return true;
  return false;
}
