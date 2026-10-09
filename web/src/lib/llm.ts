import { findViolations, type ChatMessage } from '@ugatan/shared';

export type PhoneAiStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PhoneAiState {
  status: PhoneAiStatus;
  device: string;
  progress: string;
  error: string;
}

type Listener = (state: PhoneAiState) => void;

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

  load(): void {
    if (this.worker) return;
    this.worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent) => this.onMessage(e.data);
    this.worker.onerror = () => this.set({ status: 'error', error: 'Hindi nagbukas ang AI worker.' });
    this.set({ status: 'loading', progress: 'Nagsisimula...', error: '' });
    this.worker.postMessage({ type: 'load' });
  }

  /** Resolves with the raw model text, or null when the guardrail blocks it. */
  generate(messages: ChatMessage[]): Promise<string | null> {
    if (!this.worker || !this.ready) return Promise.reject(new Error('Hindi pa handa ang AI.'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'generate', id, messages });
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
