import { afterEach, describe, expect, it, vi } from 'vitest';
import { canUseBrowserSpeech, speechLang, speechLangCandidates, startBrowserSpeech } from '../src/lib/browser-speech';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser speech helpers', () => {
  it('maps UI languages to BCP-47 tags for the Web Speech API', () => {
    expect(speechLang('tl')).toBe('en-US');
    expect(speechLangCandidates('tl')[0]).toBe('en-US');
    expect(speechLangCandidates('tl')).toContain('fil-PH');
    expect(speechLang('ceb')).toBe('en-US');
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
});
