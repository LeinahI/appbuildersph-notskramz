import type { UiLanguage } from '../config/labels';

/** Minimal SpeechRecognition shape used by the browser voice path (Chrome / WebKit). */
export interface BrowserSpeechHandle {
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  0: { transcript: string };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<SpeechRecognitionResultLike> & { length: number };
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True when this browser exposes the Web Speech API. */
export function canUseBrowserSpeech(): boolean {
  return speechRecognitionCtor() !== null;
}

/** Preferred BCP-47 tags to try for a UI language (first that the service accepts wins). */
export function speechLangCandidates(language: UiLanguage): string[] {
  if (language === 'en') return ['en-US', 'en'];
  // en-US first: Chrome's Google STT is reliable with it (same as type-by-voice). fil-PH often starts
  // but never returns results. Filipino tags are still tried if English is unsupported.
  return ['en-US', 'fil-PH', 'fil', 'tl'];
}

/** @deprecated use speechLangCandidates — kept for call sites that need one tag */
export function speechLang(language: UiLanguage): string {
  return speechLangCandidates(language)[0]!;
}

export type BrowserSpeechError = 'denied' | 'empty' | 'failed';

function transcriptOf(result: SpeechRecognitionResultLike): string {
  try {
    return (result[0]?.transcript ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * Starts browser speech recognition. Lets SpeechRecognition own the mic permission
 * (do not prime with getUserMedia — that often leaves Chrome hearing silence).
 */
export function startBrowserSpeech(opts: {
  lang: string | string[];
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
  onError: (kind: BrowserSpeechError) => void;
  onEnd: () => void;
}): BrowserSpeechHandle {
  const Ctor = speechRecognitionCtor();
  if (!Ctor) {
    opts.onError('failed');
    opts.onEnd();
    return { stop: () => {}, abort: () => {} };
  }

  const langs = (Array.isArray(opts.lang) ? opts.lang : [opts.lang]).filter(Boolean);
  let langIndex = 0;
  let recognition: SpeechRecognitionLike | null = null;
  let settled = false;
  let finals = '';
  let interim = '';
  let userStopped = false;
  let sawStart = false;
  let retryingLang = false;

  const finish = (fn: () => void) => {
    if (settled) return;
    settled = true;
    fn();
  };

  const bestText = () => (finals + (finals && interim ? ' ' : '') + interim).replace(/\s+/g, ' ').trim();

  const bind = (rec: SpeechRecognitionLike) => {
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      sawStart = true;
    };

    rec.onresult = (event) => {
      let nextInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const piece = transcriptOf(result);
        if (!piece) continue;
        if (result.isFinal) {
          finals = `${finals} ${piece}`.trim();
          nextInterim = '';
        } else {
          nextInterim = piece;
        }
      }
      interim = nextInterim;
      const live = bestText();
      if (live) opts.onInterim?.(live);

      if (finals && !interim) {
        try {
          rec.stop();
        } catch {
          /* already stopping */
        }
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'aborted') {
        finish(() => opts.onEnd());
        return;
      }

      const text = bestText();
      // Chrome often fires no-speech when the farmer taps stop — commit what we have, never toast empty.
      if (userStopped) {
        finish(() => {
          if (text) opts.onFinal(text);
          opts.onEnd();
        });
        return;
      }

      if (text && (event.error === 'no-speech' || event.error === 'audio-capture')) {
        finish(() => {
          opts.onFinal(text);
          opts.onEnd();
        });
        return;
      }

      // Retry next language when this tag is unsupported or the service rejects it.
      const canRetryLang =
        !text &&
        langIndex + 1 < langs.length &&
        (event.error === 'language-not-supported' ||
          event.error === 'network' ||
          event.error === 'service-not-allowed' ||
          (event.error === 'no-speech' && sawStart));

      if (canRetryLang && event.error !== 'no-speech') {
        retryingLang = true;
        langIndex += 1;
        return;
      }

      if (canRetryLang && event.error === 'no-speech' && langIndex === 0 && langs.length > 1) {
        retryingLang = true;
        langIndex += 1;
        return;
      }

      const kind: BrowserSpeechError =
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'denied'
          : event.error === 'no-speech'
            ? 'empty'
            : 'failed';
      finish(() => {
        opts.onError(kind);
        opts.onEnd();
      });
    };

    rec.onend = () => {
      if (retryingLang && !settled && !userStopped) {
        retryingLang = false;
        sawStart = false;
        finals = '';
        interim = '';
        startAt(langIndex);
        return;
      }

      finish(() => {
        const text = bestText();
        if (text) {
          opts.onFinal(text);
        } else if (!userStopped) {
          opts.onError('empty');
        }
        opts.onEnd();
      });
    };
  };

  const startAt = (index: number) => {
    langIndex = index;
    const rec = new Ctor();
    recognition = rec;
    rec.lang = langs[index] ?? 'en-US';
    bind(rec);
    try {
      rec.start();
    } catch {
      if (index + 1 < langs.length) {
        retryingLang = true;
        // onend may not fire if start never began — start next directly
        queueMicrotask(() => {
          if (!settled) {
            retryingLang = false;
            startAt(index + 1);
          }
        });
        return;
      }
      finish(() => {
        opts.onError('failed');
        opts.onEnd();
      });
    }
  };

  startAt(0);

  return {
    stop: () => {
      userStopped = true;
      retryingLang = false;
      try {
        recognition?.stop();
      } catch {
        /* already stopped */
      }
    },
    abort: () => {
      userStopped = true;
      retryingLang = false;
      try {
        recognition?.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}
