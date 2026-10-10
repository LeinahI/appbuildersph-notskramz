import type { UiLanguage } from '../config/labels';

/** A running speech session (browser or phone recognizer). */
export interface BrowserSpeechHandle {
  /** Ends listening and commits what was heard. */
  stop: () => void;
  /** Ends listening and throws the words away. */
  abort: () => void;
}

/**
 * Why a session failed: the mic was refused, nothing was said, the recognizer needs the internet (or a language
 * pack) it does not have, or something else broke.
 */
export type BrowserSpeechError = 'denied' | 'empty' | 'offline' | 'failed';

/** Callbacks shared by the browser and phone speech sessions. */
export interface SpeechSessionOptions {
  lang: string | string[];
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
  /** Mic level, 0 (quiet) to 1 (loud), many times a second while listening. */
  onLevel?: (level: number) => void;
  /** True while the recognizer hears speech. */
  onSpeaking?: (speaking: boolean) => void;
  onError: (kind: BrowserSpeechError) => void;
  onEnd: () => void;
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
  onaudiostart?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
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

/** Quiet after the last word before listening ends by itself. */
export const END_SILENCE_MS = 1200;
/** Shorter wait once the recognizer has marked the sentence final. */
export const END_AFTER_FINAL_MS = 700;
/** Listening ends when nothing at all is said for this long. */
export const NO_SPEECH_MS = 8000;
/** Longest a single question can be. */
export const MAX_LISTEN_MS = 30_000;

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

/**
 * BCP-47 tags to try for a UI language, best first. Farmers speak Tagalog or Taglish, and fil-PH writes both;
 * en-US is only the fallback when the recognizer has no Filipino. Cebuano has no recognizer, so it uses fil-PH too.
 */
export function speechLangCandidates(language: UiLanguage): string[] {
  if (language === 'en') return ['en-US', 'en-PH'];
  return ['fil-PH', 'en-US'];
}

/** First tag for a UI language, for recognizers that take one. */
export function speechLang(language: UiLanguage): string {
  return speechLangCandidates(language)[0]!;
}

function transcriptOf(result: SpeechRecognitionResultLike): string {
  try {
    return (result[0]?.transcript ?? '').trim();
  } catch {
    return '';
  }
}

/** Joins two pieces, dropping a repeat (Android Chrome resends the whole sentence as each new result). */
function joinPiece(text: string, piece: string): string {
  if (!text) return piece;
  const lower = text.toLowerCase();
  const next = piece.toLowerCase();
  if (next.startsWith(lower)) return piece;
  if (lower.endsWith(next)) return text;
  return `${text} ${piece}`;
}

function isMobileBrowser(): boolean {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent ?? '');
}

/**
 * Real mic level for the listening screen, from a second capture of the same mic. Desktop only: phones give the mic
 * to one capture at a time, and the recognizer must keep it. Starts after the recognizer has the mic, so it never
 * delays or replaces the recognizer's own capture. Returns a stop function.
 */
function startLevelMeter(onLevel: (level: number) => void): () => void {
  let stopped = false;
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let frame = 0;
  const stop = () => {
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
    stream?.getTracks().forEach((t) => t.stop());
    void context?.close().catch(() => {});
  };
  if (isMobileBrowser() || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
    return stop;
  }
  void navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    .then((media) => {
      stream = media;
      if (stopped) {
        stop();
        return;
      }
      context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(media).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (stopped) return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
        const rms = Math.sqrt(sum / samples.length);
        // About -50 dB is silence and -10 dB is loud speech.
        const db = 20 * Math.log10(rms || 1e-6);
        onLevel(Math.max(0, Math.min(1, (db + 50) / 40)));
        frame = requestAnimationFrame(tick);
      };
      tick();
    })
    .catch(() => {
      /* no meter; the screen falls back to the speaking state */
    });
  return stop;
}

/**
 * Starts browser speech recognition. It ends by itself after a short quiet once the farmer has spoken, after a few
 * seconds when nothing is said, or at the 30-second limit. Lets SpeechRecognition own the mic permission (do not
 * prime with getUserMedia first — that often leaves Chrome hearing silence).
 */
export function startBrowserSpeech(opts: SpeechSessionOptions): BrowserSpeechHandle {
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
  let aborted = false;
  let retryingLang = false;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  let noSpeechTimer: ReturnType<typeof setTimeout> | undefined;
  let maxTimer: ReturnType<typeof setTimeout> | undefined;
  let stopMeter: (() => void) | null = null;

  const clearTimers = () => {
    clearTimeout(endTimer);
    clearTimeout(noSpeechTimer);
    clearTimeout(maxTimer);
  };

  const finish = (fn: () => void) => {
    if (settled) return;
    settled = true;
    clearTimers();
    stopMeter?.();
    stopMeter = null;
    opts.onSpeaking?.(false);
    opts.onLevel?.(0);
    fn();
  };

  const bestText = () => (finals + (finals && interim ? ' ' : '') + interim).replace(/\s+/g, ' ').trim();

  const stopListening = () => {
    clearTimers();
    try {
      recognition?.stop();
    } catch {
      /* already stopping */
    }
  };

  const scheduleEnd = (ms: number) => {
    clearTimeout(endTimer);
    endTimer = setTimeout(stopListening, ms);
  };

  const bind = (rec: SpeechRecognitionLike) => {
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      clearTimeout(noSpeechTimer);
      noSpeechTimer = setTimeout(stopListening, NO_SPEECH_MS);
    };

    rec.onaudiostart = () => {
      if (opts.onLevel && !stopMeter) stopMeter = startLevelMeter(opts.onLevel);
    };

    rec.onspeechstart = () => opts.onSpeaking?.(true);
    rec.onspeechend = () => opts.onSpeaking?.(false);

    rec.onresult = (event) => {
      // Rebuild from every result: results can be revised, and a final can replace earlier interim pieces.
      let nextFinals = '';
      let nextInterim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const piece = transcriptOf(result);
        if (!piece) continue;
        if (result.isFinal) nextFinals = joinPiece(nextFinals, piece);
        else nextInterim = joinPiece(nextInterim, piece);
      }
      finals = nextFinals;
      interim = nextInterim;
      const live = bestText();
      if (!live) return;
      clearTimeout(noSpeechTimer);
      opts.onSpeaking?.(true);
      opts.onInterim?.(live);
      // The farmer is done when the words stop coming: a short wait after a final sentence, a little longer
      // while the recognizer is still unsure, so a pause for breath does not cut the question.
      scheduleEnd(interim ? END_SILENCE_MS : END_AFTER_FINAL_MS);
    };

    rec.onerror = (event) => {
      if (event.error === 'aborted') {
        finish(() => opts.onEnd());
        return;
      }

      const text = bestText();
      // Chrome often fires no-speech when the farmer taps stop — commit what we have, never toast empty.
      if (userStopped || (text && (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network'))) {
        finish(() => {
          if (text && !aborted) opts.onFinal(text);
          opts.onEnd();
        });
        return;
      }

      // The next language only when this one is not supported; never make the farmer say it twice.
      if (!text && langIndex + 1 < langs.length && event.error === 'language-not-supported') {
        retryingLang = true;
        langIndex += 1;
        return;
      }

      const kind: BrowserSpeechError =
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'denied'
          : event.error === 'no-speech'
            ? 'empty'
            : event.error === 'network'
              ? 'offline'
              : 'failed';
      finish(() => {
        opts.onError(kind);
        opts.onEnd();
      });
    };

    rec.onend = () => {
      if (retryingLang && !settled && !userStopped) {
        retryingLang = false;
        finals = '';
        interim = '';
        startAt(langIndex);
        return;
      }

      finish(() => {
        const text = bestText();
        if (text && !aborted) {
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
        // onend may not fire if start never began — start the next one directly.
        queueMicrotask(() => {
          if (!settled) startAt(index + 1);
        });
        return;
      }
      finish(() => {
        opts.onError('failed');
        opts.onEnd();
      });
    }
  };

  maxTimer = setTimeout(stopListening, MAX_LISTEN_MS);
  startAt(0);

  return {
    stop: () => {
      userStopped = true;
      retryingLang = false;
      stopListening();
    },
    abort: () => {
      userStopped = true;
      aborted = true;
      retryingLang = false;
      clearTimers();
      try {
        recognition?.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}
