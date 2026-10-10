import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { MAX_LISTEN_MS, type BrowserSpeechError, type BrowserSpeechHandle, type SpeechSessionOptions } from './browser-speech';

/**
 * The phone's own speech recognizer (`SpeechPlugin.java` in web/android), for the mic button in the Android app.
 * Words appear as the farmer speaks and listening ends by itself when they stop, without waiting for the hub.
 */
type SpeechEvent =
  | { type: 'ready' | 'speechStart' | 'speechEnd' | 'end' }
  | { type: 'level'; level: number }
  | { type: 'partial' | 'final'; text: string }
  | { type: 'error'; error: BrowserSpeechError | 'unavailable' };

interface SpeechPlugin {
  available(): Promise<{ available: boolean }>;
  start(options: { lang: string }): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  addListener(event: 'speech', listener: (e: SpeechEvent) => void): Promise<PluginListenerHandle>;
}

const Speech = registerPlugin<SpeechPlugin>('Speech');

let availability: Promise<boolean> | null = null;

/** True in the Android app when the phone has a speech recognizer. Asked once, then remembered. */
export function canUseNativeSpeech(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Speech')) return Promise.resolve(false);
  availability ??= Speech.available()
    .then((r) => r.available === true)
    .catch(() => false);
  return availability;
}

/** Starts the phone's recognizer with the same callbacks as the browser session. */
export function startNativeSpeech(opts: SpeechSessionOptions): BrowserSpeechHandle {
  const lang = (Array.isArray(opts.lang) ? opts.lang[0] : opts.lang) ?? 'fil-PH';
  let settled = false;
  let aborted = false;
  let text = '';
  let listener: PluginListenerHandle | null = null;
  let detached = false;

  const detach = () => {
    detached = true;
    void listener?.remove();
    listener = null;
  };

  const finish = (fn: () => void) => {
    if (settled) return;
    settled = true;
    clearTimeout(maxTimer);
    detach();
    opts.onSpeaking?.(false);
    opts.onLevel?.(0);
    fn();
  };

  const onEvent = (event: SpeechEvent) => {
    if (settled) return;
    switch (event.type) {
      case 'speechStart':
        opts.onSpeaking?.(true);
        break;
      case 'speechEnd':
        opts.onSpeaking?.(false);
        break;
      case 'level':
        opts.onLevel?.(event.level);
        break;
      case 'partial':
        text = event.text.trim();
        if (text) opts.onInterim?.(text);
        break;
      case 'final':
        text = event.text.trim() || text;
        break;
      case 'error': {
        const kind: BrowserSpeechError = event.error === 'unavailable' ? 'offline' : event.error;
        finish(() => {
          // Words already heard are kept, even when the recognizer fails at the very end.
          if (text && !aborted) opts.onFinal(text);
          else if (!aborted) opts.onError(kind);
          opts.onEnd();
        });
        break;
      }
      case 'end':
        finish(() => {
          if (text && !aborted) opts.onFinal(text);
          else if (!aborted) opts.onError('empty');
          opts.onEnd();
        });
        break;
    }
  };

  const maxTimer = setTimeout(() => void Speech.stop().catch(() => {}), MAX_LISTEN_MS);

  void Speech.addListener('speech', onEvent)
    .then((handle) => {
      // Dismissed before the listener was ready: do not open the mic at all.
      if (detached) {
        void handle.remove();
        return;
      }
      listener = handle;
      return Speech.start({ lang });
    })
    .catch((error: { code?: string }) => {
      const kind: BrowserSpeechError =
        error?.code === 'denied' ? 'denied' : error?.code === 'unavailable' ? 'offline' : 'failed';
      finish(() => {
        if (!aborted) opts.onError(kind);
        opts.onEnd();
      });
    });

  return {
    stop: () => {
      void Speech.stop().catch(() => {});
    },
    abort: () => {
      aborted = true;
      void Speech.cancel().catch(() => {});
      finish(() => opts.onEnd());
    },
  };
}
