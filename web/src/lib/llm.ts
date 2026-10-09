import { findViolations, type ChatMessage } from '@ugatan/shared';
import { PHONE_MODEL } from '../config/models';

export type PhoneAiStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PhoneAiState {
  status: PhoneAiStatus;
  device: string;
  progress: string;
  error: string;
}

type Listener = (state: PhoneAiState) => void;

/** Whether this phone has the memory for the phone model. Unknown where the browser does not say (Safari, Firefox). */
export type MemoryFit = 'fits' | 'too-small' | 'unknown';

export function phoneAiFit(
  memoryGb: number | undefined = (globalThis.navigator as { deviceMemory?: number } | undefined)?.deviceMemory,
): MemoryFit {
  if (typeof memoryGb !== 'number' || !(memoryGb > 0)) return 'unknown';
  return memoryGb >= PHONE_MODEL.minMemoryGb ? 'fits' : 'too-small';
}

/** Main-thread client for the phone AI worker. Keeps one worker for the page. */
class PhoneAi {
  private worker: Worker | null = null;
  private nextId = 1;
  private waiting = new Map<number, { resolve: (text: string | null) => void; reject: (e: Error) => void }>();
  private listeners = new Set<Listener>();
  private state: PhoneAiState = { status: 'idle', device: '', progress: '', error: '' };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  get ready(): boolean {
    return this.state.status === 'ready';
  }

  /** Loads the model from the hub at `hubUrl`, over the local Wi-Fi. */
  load(hubUrl: string): void {
    if (this.worker) return;
    this.worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent) => this.onMessage(e.data);
    this.worker.onerror = () => this.set({ status: 'error', error: 'Hindi nagbukas ang AI worker.' });
    this.set({ status: 'loading', progress: 'Nagsisimula...', error: '' });
    this.worker.postMessage({ type: 'load', hubUrl });
  }

  /**
   * Resolves with the raw model text, or null when the guardrail blocks it. With `image` (a base64 JPEG), the model
   * reads the photo with the messages, which must be [system, user] as buildPhotoMessages makes them.
   */
  generate(messages: ChatMessage[], opts: { maxNewTokens?: number; image?: string } = {}): Promise<string | null> {
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
        const p = msg.data as { status?: string; file?: string; progress?: number };
        const progress =
          p.status === 'progress' ? `Nagda-download: ${Math.round(p.progress ?? 0)}% ${p.file ?? ''}` : p.status ?? '';
        this.set({ progress });
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
          this.set({ status: 'error', error: message });
        }
        return;
      }
    }
  }

  private set(patch: Partial<PhoneAiState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }
}

export const phoneAi = new PhoneAi();
