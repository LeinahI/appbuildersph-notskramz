import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  END_AFTER_FINAL_MS,
  END_SILENCE_MS,
  NO_SPEECH_MS,
  canUseBrowserSpeech,
  speechLang,
  speechLangCandidates,
  startBrowserSpeech,
} from '../src/lib/browser-speech';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type FakeRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

/** One fake recognizer; stop() ends it the way Chrome does. */
function fakeRecognition(): FakeRecognition {
  const instance: FakeRecognition = {
    lang: '',
    interimResults: false,
    continuous: false,
    maxAlternatives: 1,
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,
    start: vi.fn(),
    stop: vi.fn(() => instance.onend?.()),
    abort: vi.fn(),
  };
  vi.stubGlobal('window', {
    SpeechRecognition: function SpeechRecognition() {
      return instance;
    },
  });
  return instance;
}

const said = (text: string, isFinal: boolean) => ({
  resultIndex: 0,
  results: [{ isFinal, length: 1, 0: { transcript: text } }],
});

describe('browser speech helpers', () => {
  it('maps UI languages to BCP-47 tags for the Web Speech API', () => {
    // Tagalog and Taglish are written best by fil-PH; en-US is only the fallback.
    expect(speechLang('tl')).toBe('fil-PH');
    expect(speechLangCandidates('tl')).toEqual(['fil-PH', 'en-US']);
    expect(speechLang('ceb')).toBe('fil-PH');
    expect(speechLang('en')).toBe('en-US');
  });

  it('is false when SpeechRecognition is missing', () => {
    vi.stubGlobal('window', {});
    expect(canUseBrowserSpeech()).toBe(false);
  });

  it('is true when webkitSpeechRecognition exists', () => {
    vi.stubGlobal('window', { webkitSpeechRecognition: class {} });
    expect(canUseBrowserSpeech()).toBe(true);
  });

  it('commits interim text when the session ends without a final result', () => {
    type Handlers = {
      onstart: (() => void) | null;
      onresult: ((event: unknown) => void) | null;
      onerror: ((event: { error: string }) => void) | null;
      onend: (() => void) | null;
    };
    const instance: Handlers & {
      start: () => void;
      stop: () => void;
      abort: () => void;
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      maxAlternatives: number;
    } = {
      lang: '',
      interimResults: false,
      continuous: false,
      maxAlternatives: 1,
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
    };
    vi.stubGlobal('window', {
      SpeechRecognition: function SpeechRecognition() {
        return instance;
      },
    });

    const onFinal = vi.fn();
    const onInterim = vi.fn();
    const onError = vi.fn();
    const onEnd = vi.fn();
    startBrowserSpeech({ lang: 'fil-PH', onFinal, onInterim, onError, onEnd });

    instance.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: false, length: 1, 0: { transcript: 'may guhit sa dahon' } }],
    });
    expect(onInterim).toHaveBeenCalledWith('may guhit sa dahon');

    instance.onend?.();
    expect(onFinal).toHaveBeenCalledWith('may guhit sa dahon');
    expect(onError).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
  });

  it('retries the next language when the first is unsupported', () => {
    let builds = 0;
    const instances: Array<{
      lang: string;
      onerror: ((event: { error: string }) => void) | null;
      onend: (() => void) | null;
      onstart: (() => void) | null;
      onresult: ((event: unknown) => void) | null;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      abort: ReturnType<typeof vi.fn>;
      interimResults: boolean;
      continuous: boolean;
      maxAlternatives: number;
    }> = [];

    vi.stubGlobal('window', {
      SpeechRecognition: function SpeechRecognition() {
        const instance = {
          lang: '',
          interimResults: false,
          continuous: false,
          maxAlternatives: 1,
          onstart: null as (() => void) | null,
          onresult: null as ((event: unknown) => void) | null,
          onerror: null as ((event: { error: string }) => void) | null,
          onend: null as (() => void) | null,
          start: vi.fn(),
          stop: vi.fn(),
          abort: vi.fn(),
        };
        instances.push(instance);
        builds += 1;
        return instance;
      },
    });

    const onFinal = vi.fn();
    const onError = vi.fn();
    const onEnd = vi.fn();
    startBrowserSpeech({ lang: ['fil-PH', 'en-US'], onFinal, onError, onEnd });
    expect(builds).toBe(1);
    expect(instances[0]!.lang).toBe('fil-PH');

    instances[0]!.onerror?.({ error: 'language-not-supported' });
    instances[0]!.onend?.();
    expect(builds).toBe(2);
    expect(instances[1]!.lang).toBe('en-US');

    instances[1]!.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, length: 1, 0: { transcript: 'hello' } }],
    });
    instances[1]!.onend?.();
    expect(onFinal).toHaveBeenCalledWith('hello');
    expect(onError).not.toHaveBeenCalled();
  });

  it('stops by itself after a short quiet once the farmer has spoken', () => {
    vi.useFakeTimers();
    const rec = fakeRecognition();
    const onFinal = vi.fn();
    const onEnd = vi.fn();
    startBrowserSpeech({ lang: 'fil-PH', onFinal, onError: vi.fn(), onEnd });
    rec.onstart?.();

    rec.onresult?.(said('naninilaw ang', false));
    vi.advanceTimersByTime(END_SILENCE_MS - 100);
    // Still talking: a new word resets the wait.
    rec.onresult?.(said('naninilaw ang dahon', false));
    vi.advanceTimersByTime(END_SILENCE_MS - 100);
    expect(rec.stop).not.toHaveBeenCalled();

    rec.onresult?.(said('naninilaw ang dahon ng palay', true));
    vi.advanceTimersByTime(END_AFTER_FINAL_MS);
    expect(rec.stop).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('naninilaw ang dahon ng palay');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('stops and says nothing was heard when the farmer stays quiet', () => {
    vi.useFakeTimers();
    const rec = fakeRecognition();
    const onError = vi.fn();
    startBrowserSpeech({ lang: 'fil-PH', onFinal: vi.fn(), onError, onEnd: vi.fn() });
    rec.onstart?.();
    vi.advanceTimersByTime(NO_SPEECH_MS);
    expect(rec.stop).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('empty');
  });

  it('reports offline on a network error before any words, so the app can use the hub', () => {
    const rec = fakeRecognition();
    const onError = vi.fn();
    const onEnd = vi.fn();
    startBrowserSpeech({ lang: ['fil-PH', 'en-US'], onFinal: vi.fn(), onError, onEnd });
    rec.onerror?.({ error: 'network' });
    expect(onError).toHaveBeenCalledWith('offline');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('does not repeat a sentence Android Chrome sends again', () => {
    const rec = fakeRecognition();
    const onInterim = vi.fn();
    startBrowserSpeech({ lang: 'fil-PH', onFinal: vi.fn(), onInterim, onError: vi.fn(), onEnd: vi.fn() });
    rec.onresult?.({
      resultIndex: 1,
      results: [
        { isFinal: true, length: 1, 0: { transcript: 'may uod' } },
        { isFinal: true, length: 1, 0: { transcript: 'may uod sa mais' } },
      ],
    });
    expect(onInterim).toHaveBeenLastCalledWith('may uod sa mais');
  });

  it('throws the words away when dismissed', () => {
    const rec = fakeRecognition();
    const onFinal = vi.fn();
    const handle = startBrowserSpeech({ lang: 'fil-PH', onFinal, onError: vi.fn(), onEnd: vi.fn() });
    rec.onresult?.(said('may batik', false));
    handle.abort();
    rec.onend?.();
    expect(onFinal).not.toHaveBeenCalled();
  });
});
