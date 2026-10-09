import { PHONE_LITERT_PATH, findViolations, type ChatMessage } from '@ugatan/shared';
import { PHONE_MODEL } from '../config/models';
import { FileTally, type ByteProgress } from './download-progress';
import { LocalLlm, NATIVE_AI, toNativeRequest, type NativeAnswer } from './native-llm';

export type PhoneAiStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PhoneAiState {
  status: PhoneAiStatus;
  device: string;
  progress: string;
  /** Bytes downloaded so far across all the model's files, while loading. */
  bytes?: ByteProgress;
  error: string;
}

type Listener = (state: PhoneAiState) => void;

/** Whether this phone has the memory for the phone model. Unknown where the browser does not say (Safari, Firefox). */
export type MemoryFit = 'fits' | 'too-small' | 'unknown';

export function phoneAiFit(
  memoryGb: number | undefined = (globalThis.navigator as { deviceMemory?: number } | undefined)?.deviceMemory,
): MemoryFit {
  // Test builds only (an emulator that reports less memory than the AI needs). Never set for farmers' builds.
  if (import.meta.env.VITE_TEST_SKIP_MEMORY_CHECK === '1') return 'fits';
  if (typeof memoryGb !== 'number' || !(memoryGb > 0)) return 'unknown';
  return memoryGb >= PHONE_MODEL.minMemoryGb ? 'fits' : 'too-small';
}

/** Main-thread client for the phone AI worker. Keeps one worker for the page. */
class PhoneAi {
  private worker: Worker | null = null;
  private nextId = 1;
  private waiting = new Map<number, { resolve: (text: string | null) => void; reject: (e: Error) => void }>();
  private listeners = new Set<Listener>();
  private tally = new FileTally();
  private state: PhoneAiState = { status: 'idle', device: '', progress: '', error: '' };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  get ready(): boolean {
    return this.state.status === 'ready';
  }

  /** The last native answer's speed figures, for checking a phone. */
  lastSpeed: Omit<NativeAnswer, 'text'> | null = null;
  private nativeBusy = false;

  /** Loads the model from the hub at `hubUrl`, over the local Wi-Fi. After an error, calling it again starts over. */
  load(hubUrl: string): void {
    if (NATIVE_AI) {
      void this.loadNative(hubUrl);
      return;
    }
    if (this.worker) {
      if (this.state.status !== 'error') return;
      this.worker.terminate();
      this.worker = null;
      this.tally = new FileTally();
    }
    this.worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent) => this.onMessage(e.data);
    this.worker.onerror = () => this.set({ status: 'error', error: 'Hindi nagbukas ang AI worker.' });
    this.set({ status: 'loading', progress: 'Nagsisimula...', error: '', bytes: undefined });
    this.worker.postMessage({ type: 'load', hubUrl });
  }

  /**
   * Resolves with the raw model text, or null when the guardrail blocks it. With `image` (a base64 JPEG), the model
   * reads the photo with the messages, which must be [system, user] as buildPhotoMessages makes them.
   */
  generate(messages: ChatMessage[], opts: { maxNewTokens?: number; image?: string } = {}): Promise<string | null> {
    if (NATIVE_AI) return this.generateNative(messages, opts);
    if (!this.worker || !this.ready) return Promise.reject(new Error('Hindi pa handa ang AI.'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'generate', id, messages, ...opts });
    });
  }

  private onMessage(msg: { type: string; data?: any; id?: number }) {
    switch (msg.type) {
      case 'progress': {
        const p = msg.data as { status?: string; file?: string; progress?: number; loaded?: number; total?: number };
        if (p.file && p.status === 'progress') {
          this.set({ progress: p.file, bytes: this.tally.update(p.file, p.loaded ?? 0, p.total ?? 0) });
        } else if (p.file && p.status === 'done') {
          this.set({ bytes: this.tally.finish(p.file) });
        }
        return;
      }
      case 'ready':
        this.set({
          status: 'ready',
          device: msg.data === 'webgpu' ? 'GPU (WebGPU)' : 'CPU (mas mabagal)',
          progress: '',
        });
        return;
      case 'done': {
        const text = String(msg.data ?? '');
        const pending = msg.id !== undefined ? this.waiting.get(msg.id) : undefined;
        this.waiting.delete(msg.id ?? -1);
        // Guardrail: a brand name or a dosage means the whole explanation is dropped.
        pending?.resolve(findViolations(text).length === 0 ? text : null);
        return;
      }
      case 'error': {
        const message = String(msg.data ?? 'May error.');
        if (msg.id !== undefined && this.waiting.has(msg.id)) {
          this.waiting.get(msg.id)!.reject(new Error(message));
          this.waiting.delete(msg.id);
        } else {
          // The load failed: stop the worker so the other files stop downloading. Loading again starts a new one.
          this.worker?.terminate();
          this.worker = null;
          this.set({ status: 'error', error: message });
        }
        return;
      }
    }
  }

  /**
   * The Android app: the model file comes once from the hub (resumable) into the app's storage, then the engine starts
   * on the phone's CPU. Later starts skip the download, so they need no hub.
   */
  private async loadNative(hubUrl: string) {
    if (this.nativeBusy || this.ready) return;
    this.nativeBusy = true;
    this.set({ status: 'loading', progress: 'Nagsisimula...', error: '', bytes: undefined });
    const listener = await LocalLlm.addListener('downloadProgress', (e) => {
      this.set({ progress: 'Gemma', bytes: { loaded: e.loaded, total: e.total > 0 ? e.total : e.loaded } });
    });
    try {
      const status = await LocalLlm.status();
      if (!status.downloaded) await LocalLlm.download({ url: `${hubUrl}/models/${PHONE_LITERT_PATH}` });
      else this.set({ bytes: { loaded: status.bytes, total: status.bytes } });
      this.set({ progress: 'Inihahanda ang Ugatan AI...' });
      const loaded = await LocalLlm.load({ backend: 'cpu' });
      this.set({ status: 'ready', device: loaded.backend === 'gpu' ? 'GPU (sa cellphone)' : 'CPU (sa cellphone)', progress: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.set({
        status: 'error',
        error: message === 'NO_SPACE' ? 'Kulang ang espasyo sa cellphone para sa Ugatan AI (mga 2.6 GB).' : message,
      });
    } finally {
      this.nativeBusy = false;
      void listener.remove();
    }
  }

  private async generateNative(messages: ChatMessage[], opts: { maxNewTokens?: number; image?: string }): Promise<string | null> {
    if (!this.ready) throw new Error('Hindi pa handa ang AI.');
    const answer = await LocalLlm.generate({
      ...toNativeRequest(messages),
      ...(opts.image ? { image: opts.image } : {}),
      maxTokens: opts.maxNewTokens ?? 260,
    });
    const { text, ...speed } = answer;
    this.lastSpeed = speed;
    // Shows in the phone's log (adb logcat -s chromium), to check speed on a real phone.
    console.info(`[ugatan-ai] ${JSON.stringify(speed)}`);
    // Guardrail: a brand name or a dosage means the whole explanation is dropped.
    return findViolations(text).length === 0 ? text : null;
  }

  private set(patch: Partial<PhoneAiState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }
}

export const phoneAi = new PhoneAi();
