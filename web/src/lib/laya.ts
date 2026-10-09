import { LAYA_INSTRUCTIONS, problemOptions, type Crop, type KnowledgeEntry } from '@ugatan/shared';

export type LayaStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LayaState {
  status: LayaStatus;
  device: string;
  progress: string;
  error: string;
}

/** Laya's answer, as the hub's Laya matcher gives it: the top two problem ids, and whether it is sure. */
export interface LayaOutcome {
  ids: string[];
  clear: boolean;
}

type Listener = (state: LayaState) => void;
type Answer = { options: string[]; probabilities: number[]; confidence: number };

/** Main-thread client for the Laya worker. Keeps one worker for the page. */
class PhoneLaya {
  private worker: Worker | null = null;
  private nextId = 1;
  private threshold = 1;
  private waiting = new Map<number, { resolve: (a: Answer) => void; reject: (e: Error) => void }>();
  private listeners = new Set<Listener>();
  private state: LayaState = { status: 'idle', device: '', progress: '', error: '' };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  get ready(): boolean {
    return this.state.status === 'ready';
  }

  /** Loads Laya from the hub at `hubUrl`. `threshold` is the team's confidence threshold, from the hub's /health. */
  load(hubUrl: string, threshold: number): void {
    if (this.worker) return;
    this.threshold = threshold;
    this.worker = new Worker(new URL('../workers/laya.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent) => this.onMessage(e.data);
    this.worker.onerror = () => this.set({ status: 'error', error: 'Hindi nagbukas ang Laya worker.' });
    this.set({ status: 'loading', progress: 'Nagsisimula...', error: '' });
    this.worker.postMessage({ type: 'load', hubUrl });
  }

  /** Ranks the problems for one description, as the hub's Laya matcher does: one option per entry of the crop. */
  async match(text: string, crop: Crop | 'any', entries: readonly KnowledgeEntry[]): Promise<LayaOutcome> {
    if (!this.worker || !this.ready) throw new Error('Hindi pa handa ang Laya.');
    const pool = entries.filter((e) => crop === 'any' || e.crop === crop);
    if (pool.length === 0) return { ids: [], clear: false };
    const { ids: poolIds, texts } = problemOptions(pool);
    const id = this.nextId++;
    const answer = await new Promise<Answer>((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'ask', id, description: text, instructions: LAYA_INSTRUCTIONS, options: texts });
    });
    // Laya names each option by its text. Map back to the problem id, best first.
    const ids = answer.options
      .map((option, i) => ({ id: poolIds[texts.indexOf(option)], p: answer.probabilities[i] ?? 0 }))
      .sort((a, b) => b.p - a.p)
      .map((o) => o.id)
      .filter((v): v is string => v !== undefined);
    return { ids: ids.slice(0, 2), clear: answer.confidence >= this.threshold };
  }

  private onMessage(msg: { type: string; data?: any; id?: number }) {
    switch (msg.type) {
      case 'progress': {
        const p = msg.data as { status?: string; file?: string; progress?: number };
        this.set({ progress: p.status ?? `Nagda-download ang Laya: ${p.progress ?? 0}% ${p.file ?? ''}` });
        return;
      }
      case 'ready':
        this.set({ status: 'ready', device: msg.data === 'webgpu' ? 'GPU (WebGPU)' : 'CPU (mas mabagal)', progress: '' });
        return;
      case 'done': {
        const pending = msg.id !== undefined ? this.waiting.get(msg.id) : undefined;
        this.waiting.delete(msg.id ?? -1);
        pending?.resolve(msg.data as Answer);
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

  private set(patch: Partial<LayaState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }
}

export const phoneLaya = new PhoneLaya();
