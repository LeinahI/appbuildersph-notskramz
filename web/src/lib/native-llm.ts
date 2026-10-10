import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { ChatMessage } from '@ugatan/shared';

/**
 * Gemma 4 E2B running natively on the phone (LiteRT-LM, `LocalLlmPlugin.java` in web/android), for the Android app.
 * It runs on the phone's CPU, so phones whose GPU cannot run the model in the web view still get the AI. The browser
 * build keeps the WebGPU worker (workers/llm.worker.ts).
 */
interface LocalLlmPlugin {
  status(): Promise<{ downloaded: boolean; bytes: number; partBytes: number; loaded: boolean; backend: string; freeBytes: number }>;
  download(options: { url: string }): Promise<{ bytes: number }>;
  load(options: { backend: 'cpu' | 'gpu' }): Promise<{ backend: string; initSeconds: number }>;
  generate(options: {
    system: string;
    turns: { role: 'user' | 'model'; text: string }[];
    prompt: string;
    image?: string;
    maxTokens: number;
  }): Promise<NativeAnswer>;
  unload(): Promise<void>;
  /** The phone's Wi-Fi: its gateway (the hub's hotspot address) and the phone's own address. Null off Wi-Fi. */
  network(): Promise<{ gateway: string | null; ip: string | null }>;
  addListener(event: 'downloadProgress', listener: (e: { loaded: number; total: number }) => void): Promise<PluginListenerHandle>;
}

/** The answer and, when the engine reports them, its speed figures. */
export interface NativeAnswer {
  text: string;
  prefillTokens?: number;
  decodeTokens?: number;
  prefillPerSecond?: number;
  decodePerSecond?: number;
  firstTokenSeconds?: number;
}

export const LocalLlm = registerPlugin<LocalLlmPlugin>('LocalLlm');

/** True in the Android app, where the native model is used instead of WebGPU. */
export const NATIVE_AI = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalLlm');

/** Size of the native model file, for the setup page's percent before the hub reports it. */
export const NATIVE_MODEL_BYTES = 2_588_147_712;

/**
 * The app's messages ([system, ...earlier turns, user]) in the plugin's shape: the system prompt, the earlier turns
 * as user/model, and the last user message as the prompt.
 */
export function toNativeRequest(messages: readonly ChatMessage[]): { system: string; turns: { role: 'user' | 'model'; text: string }[]; prompt: string } {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const chat = messages.filter((m) => m.role !== 'system');
  const last = chat[chat.length - 1];
  const prompt = last && last.role === 'user' ? last.content : '';
  const earlier = last && last.role === 'user' ? chat.slice(0, -1) : chat;
  return {
    system,
    turns: earlier.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })),
    prompt,
  };
}
