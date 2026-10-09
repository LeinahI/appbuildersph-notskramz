import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceInput } from '../src/components/VoiceInput';
import { LABELS, type UiLanguage } from '../src/config/labels';

// Exercise the platform callbacks in Node without requiring microphone permission.
const hooks = vi.hoisted(() => ({
  listening: false,
  refIndex: 0,
  refs: [] as { current: unknown }[],
  mounted: false,
  cleanup: undefined as (() => void) | undefined,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: () => [hooks.listening, (value: boolean) => { hooks.listening = value; }],
    useRef: (value: unknown) => {
      const index = hooks.refIndex++;
      return hooks.refs[index] ?? (hooks.refs[index] = { current: value });
    },
    useEffect: (effect: () => (() => void)) => {
      if (!hooks.mounted) {
        hooks.cleanup = effect();
        hooks.mounted = true;
      }
    },
  };
});

class FakeRecognition {
  lang = '';
  interimResults = true;
  continuous = true;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

function renderVoice(language: UiLanguage = 'tl', onTranscript = vi.fn(), onNotice = vi.fn()) {
  hooks.refIndex = 0;
  const button = VoiceInput({ language, labels: LABELS[language], onTranscript, onNotice });
  return { button, onTranscript, onNotice };
}

beforeEach(() => {
  hooks.listening = false;
  hooks.refs = [];
  hooks.refIndex = 0;
  hooks.mounted = false;
  hooks.cleanup = undefined;
});

afterEach(() => {
  hooks.cleanup?.();
  vi.unstubAllGlobals();
});

describe('composer voice input', () => {
  it('keeps the microphone visible and explains unsupported browsers on click', () => {
    const { button, onNotice } = renderVoice();
    expect(button.props['aria-label']).toBe(LABELS.tl.voiceStart);
    button.props.onClick();
    expect(onNotice).toHaveBeenCalledWith(LABELS.tl.voiceUnavailable);
  });

  it.each([
    ['tl', 'fil-PH', 'SpeechRecognition'],
    ['en', 'en-PH', 'webkitSpeechRecognition'],
    ['ceb', 'ceb-PH', 'SpeechRecognition'],
  ] as const)('dictates with the %s locale, appends text, and clears listening on end', (language, locale, api) => {
    const rec = new FakeRecognition();
    vi.stubGlobal('window', { [api]: function () { return rec; } });
    const { button, onTranscript, onNotice } = renderVoice(language);
    button.props.onClick();
    expect(rec.start).toHaveBeenCalledOnce();
    expect(rec.lang).toBe(locale);
    expect(rec.interimResults).toBe(false);
    expect(onNotice).toHaveBeenCalledWith(LABELS[language].voiceListening);
    rec.onresult?.({ results: [[{ transcript: '  nanilaw ' }], [{ transcript: ' ang dahon  ' }]] });
    expect(onTranscript).toHaveBeenCalledWith('nanilaw ang dahon');
    rec.onend?.();
    expect(hooks.listening).toBe(false);
    expect(onNotice).toHaveBeenLastCalledWith('');
  });

  it('shows a localized permission error without clearing it when recognition ends', () => {
    const rec = new FakeRecognition();
    vi.stubGlobal('window', { SpeechRecognition: function () { return rec; } });
    const { button, onNotice } = renderVoice('en');
    button.props.onClick();
    rec.onerror?.({ error: 'not-allowed' });
    rec.onend?.();
    expect(hooks.listening).toBe(false);
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.en.voiceError);
  });

  it('handles a synchronous start failure', () => {
    const rec = new FakeRecognition();
    rec.start.mockImplementation(() => { throw new Error('no microphone'); });
    vi.stubGlobal('window', { SpeechRecognition: function () { return rec; } });
    const { button, onNotice } = renderVoice();
    button.props.onClick();
    expect(hooks.listening).toBe(false);
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.tl.voiceError);
  });

  it('shows a stop control while listening and aborts with detached handlers on cleanup', () => {
    const rec = new FakeRecognition();
    vi.stubGlobal('window', { SpeechRecognition: function () { return rec; } });
    const first = renderVoice();
    first.button.props.onClick();
    const active = renderVoice();
    expect(active.button.props['aria-label']).toBe(LABELS.tl.voiceStop);
    expect(active.button.props['aria-pressed']).toBe(true);
    active.button.props.onClick();
    expect(rec.stop).toHaveBeenCalledOnce();
    hooks.cleanup?.();
    expect(rec.abort).toHaveBeenCalledOnce();
    expect(rec.onresult).toBeNull();
    expect(rec.onerror).toBeNull();
    expect(rec.onend).toBeNull();
  });
});
