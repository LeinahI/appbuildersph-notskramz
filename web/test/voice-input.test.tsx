import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceInput } from '../src/components/VoiceInput';
import { LABELS, type UiLanguage } from '../src/config/labels';

// Exercise the platform callbacks in Node without requiring microphone permission. The mocked hooks keep state by call
// order, so the component can be called like a function and re-"rendered" after each interaction.
const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  stateIndex: 0,
  refs: [] as { current: unknown }[],
  refIndex: 0,
  mounted: false,
  cleanups: [] as (() => void)[],
  hubVoice: false,
  canRecord: false,
  recorder: null as null | { stop: () => Promise<string>; cancel: () => void },
  transcript: { status: 'ok', text: 'nanilaw ang dahon' } as { status: string; text?: string },
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = hooks.stateIndex++;
      if (!(index in hooks.states)) hooks.states[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      return [hooks.states[index], (value: unknown) => { hooks.states[index] = value; }];
    },
    useRef: (value: unknown) => {
      const index = hooks.refIndex++;
      return hooks.refs[index] ?? (hooks.refs[index] = { current: value });
    },
    useEffect: (effect: () => (() => void) | void) => {
      if (hooks.mounted) return;
      const cleanup = effect();
      if (cleanup) hooks.cleanups.push(cleanup);
    },
  };
});

vi.mock('../src/lib/sync', () => ({
  hubCapabilities: async () => (hooks.hubVoice ? { voice: true } : null),
  transcribeOnHub: async () => hooks.transcript,
}));

vi.mock('../src/lib/recorder', () => ({
  canRecord: () => hooks.canRecord,
  startRecorder: async () => hooks.recorder,
}));

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

const mode = () => hooks.states[0];

function renderVoice(language: UiLanguage = 'tl', onTranscript = vi.fn(), onNotice = vi.fn()) {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  const button = VoiceInput({ language, labels: LABELS[language], hubUrl: '', onTranscript, onNotice });
  hooks.mounted = true;
  return { button, onTranscript, onNotice };
}

beforeEach(() => {
  hooks.states = [];
  hooks.stateIndex = 0;
  hooks.refs = [];
  hooks.refIndex = 0;
  hooks.mounted = false;
  hooks.cleanups = [];
  hooks.hubVoice = false;
  hooks.canRecord = false;
  hooks.recorder = null;
  hooks.transcript = { status: 'ok', text: 'nanilaw ang dahon' };
});

afterEach(() => {
  hooks.cleanups.forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

describe('composer voice input', () => {
  it('keeps the microphone visible and explains unsupported browsers on click', () => {
    const { button, onNotice } = renderVoice();
    expect(button.props['aria-label']).toBe(LABELS.tl.voiceStart);
    button.props.onClick();
    expect(onNotice).toHaveBeenCalledWith(LABELS.tl.voiceUnavailable);
    expect(mode()).toBe('idle');
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
    expect(mode()).toBe('browser');
    expect(onNotice).toHaveBeenCalledWith(LABELS[language].voiceListening);
    rec.onresult?.({ results: [[{ transcript: '  nanilaw ' }], [{ transcript: ' ang dahon  ' }]] });
    expect(onTranscript).toHaveBeenCalledWith('nanilaw ang dahon');
    rec.onend?.();
    expect(mode()).toBe('idle');
    expect(onNotice).toHaveBeenLastCalledWith('');
  });

  it('shows a localized permission error without clearing it when recognition ends', () => {
    const rec = new FakeRecognition();
    vi.stubGlobal('window', { SpeechRecognition: function () { return rec; } });
    const { button, onNotice } = renderVoice('en');
    button.props.onClick();
    rec.onerror?.({ error: 'not-allowed' });
    rec.onend?.();
    expect(mode()).toBe('idle');
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.en.voiceError);
  });

  it('handles a synchronous start failure', () => {
    const rec = new FakeRecognition();
    rec.start.mockImplementation(() => { throw new Error('no microphone'); });
    vi.stubGlobal('window', { SpeechRecognition: function () { return rec; } });
    const { button, onNotice } = renderVoice();
    button.props.onClick();
    expect(mode()).toBe('idle');
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
    hooks.cleanups.forEach((cleanup) => cleanup());
    expect(rec.abort).toHaveBeenCalledOnce();
    expect(rec.onresult).toBeNull();
    expect(rec.onerror).toBeNull();
    expect(rec.onend).toBeNull();
  });
});

describe('voice input through the hub', () => {
  it('records on the phone, lets the hub write the words, and appends them without sending', async () => {
    hooks.hubVoice = true;
    hooks.canRecord = true;
    hooks.recorder = { stop: async () => 'pcm', cancel: vi.fn() };
    const onTranscript = vi.fn();
    const onNotice = vi.fn();
    // The first render asks the hub what it can do. Its answer arrives after the render, so render again.
    renderVoice('tl', onTranscript, onNotice);
    await Promise.resolve();
    await Promise.resolve();
    const start = renderVoice('tl', onTranscript, onNotice);
    expect(start.button.props.title).toContain(LABELS.tl.voiceHubHint);

    start.button.props.onClick();
    await Promise.resolve();
    await Promise.resolve();
    expect(mode()).toBe('recording');
    expect(onNotice).toHaveBeenCalledWith(LABELS.tl.voiceRecording);

    const stop = renderVoice('tl', onTranscript, onNotice);
    expect(stop.button.props['aria-label']).toBe(LABELS.tl.voiceStop);
    stop.button.props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onNotice).toHaveBeenCalledWith(LABELS.tl.voiceWorking);
    expect(onTranscript).toHaveBeenCalledWith('nanilaw ang dahon');
    expect(mode()).toBe('idle');
  });

  it('says so when the hub heard nothing', async () => {
    hooks.hubVoice = true;
    hooks.canRecord = true;
    hooks.recorder = { stop: async () => 'pcm', cancel: vi.fn() };
    hooks.transcript = { status: 'empty' };
    const onTranscript = vi.fn();
    const onNotice = vi.fn();
    renderVoice('tl', onTranscript, onNotice);
    await Promise.resolve();
    await Promise.resolve();
    renderVoice('tl', onTranscript, onNotice).button.props.onClick();
    await Promise.resolve();
    await Promise.resolve();
    renderVoice('tl', onTranscript, onNotice).button.props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.tl.voiceEmpty);
    expect(onTranscript).not.toHaveBeenCalled();
  });
});
