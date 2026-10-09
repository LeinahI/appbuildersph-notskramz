import { phoneLaya } from './laya';
import { phoneAi } from './llm';

/**
 * Loads the phone AI: Gemma first, then Laya once Gemma is ready, so the two never hold the phone's memory at once.
 * The first time, the files come from the hub at `hubUrl`; later, from the phone's own cache with no hub. Without a
 * threshold (the hub offered no Laya), only Gemma loads and the phone matches with keyword and Gemma's English.
 */
export function prepareModels(hubUrl: string, layaThreshold: number | null): void {
  phoneAi.load(hubUrl);
  if (layaThreshold === null) return;
  const stop = phoneAi.subscribe((state) => {
    if (state.status !== 'ready') return;
    phoneLaya.load(hubUrl, layaThreshold);
    // Unsubscribe after this call returns: subscribe calls the listener at once when Gemma is already ready.
    queueMicrotask(() => stop());
  });
}
