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
  native: false,
  canBrowserSpeech: false,
  recorder: null as null | { stop: () => Promise<string>; cancel: () => void },
  transcript: { status: 'ok', text: 'nanilaw ang dahon' } as { status: string; text?: string },
  nativeSpeech: false,
  browserStart: null as null | SessionOptions,
  nativeStart: null as null | SessionOptions,
}));

type SessionOptions = {
  lang: string | string[];
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
  onError: (kind: 'denied' | 'empty' | 'offline' | 'failed') => void;
  onEnd: () => void;
};

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

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => hooks.native },
}));

vi.mock('../src/lib/sync', () => ({
  hubCapabilities: async () => (hooks.hubVoice ? { voice: true } : null),
  transcribeOnHub: async () => hooks.transcript,
}));

vi.mock('../src/lib/recorder', () => ({
  canRecord: () => hooks.canRecord,
  startRecorder: async () => hooks.recorder,
}));

vi.mock('../src/lib/native-speech', () => ({
  canUseNativeSpeech: async () => hooks.nativeSpeech,
  startNativeSpeech: (opts: SessionOptions) => {
    hooks.nativeStart = opts;
    return { stop: vi.fn(), abort: vi.fn() };
  },
}));

vi.mock('../src/lib/browser-speech', () => ({
  canUseBrowserSpeech: () => hooks.canBrowserSpeech,
  speechLangCandidates: (language: string) => (language === 'en' ? ['en-US'] : ['en-US', 'fil-PH']),
  startBrowserSpeech: (opts: typeof hooks.browserStart) => {
    hooks.browserStart = opts;
    return { stop: vi.fn(), abort: vi.fn() };
  },
}));

const mode = () => hooks.states[0];
// mode, hubVoice, path, liveText

function micButton(tree: { props: { children: unknown } }) {
  const children = tree.props.children as { props: { onClick: () => void; [key: string]: unknown } }[];
  return children[0];
}

function renderVoice(language: UiLanguage = 'tl', onTranscript = vi.fn(), onNotice = vi.fn()) {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  const tree = VoiceInput({ language, labels: LABELS[language], hubUrl: '', onTranscript, onNotice }) as {
    props: { children: unknown };
  };
  hooks.mounted = true;
  return { button: micButton(tree), tree, onTranscript, onNotice };
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
  hooks.native = false;
  hooks.canBrowserSpeech = false;
  hooks.recorder = null;
  hooks.transcript = { status: 'ok', text: 'nanilaw ang dahon' };
  hooks.browserStart = null;
  hooks.nativeStart = null;
  hooks.nativeSpeech = false;
});

afterEach(() => {
  hooks.cleanups.forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('composer voice input, browser SpeechRecognition', () => {
  it('starts browser speech when SpeechRecognition is available', async () => {
    hooks.canBrowserSpeech = true;
    const onTranscript = vi.fn();
    const onNotice = vi.fn();
    const { button } = renderVoice('tl', onTranscript, onNotice);
    expect(button.props['aria-label']).toBe(LABELS.tl.voiceStart);
    button.props.onClick();
    await settle();
    expect(mode()).toBe('recording');
    expect(hooks.browserStart?.lang).toEqual(['en-US', 'fil-PH']);
    hooks.browserStart?.onInterim?.('may guhit');
    hooks.browserStart?.onFinal('may guhit sa dahon');
    hooks.browserStart?.onEnd();
    expect(onTranscript).toHaveBeenCalledWith('may guhit sa dahon');
    expect(mode()).toBe('idle');
  });

  it('starts browser speech without waiting for the hub', async () => {
    hooks.canBrowserSpeech = true;
    hooks.hubVoice = false;
    const { button, onNotice } = renderVoice();
    button.props.onClick();
    // No await of hubCapabilities — recording begins on the same turn.
    expect(mode()).toBe('recording');
    expect(hooks.browserStart).not.toBeNull();
    expect(onNotice).not.toHaveBeenCalledWith(LABELS.tl.voiceUnavailable);
  });

  it('says unavailable when neither browser speech nor hub voice is available', async () => {
    hooks.canRecord = true;
    const { button, onNotice } = renderVoice();
    button.props.onClick();
    await settle();
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.tl.voiceUnavailable);
    expect(mode()).toBe('idle');
  });

  it('hints that browser voice needs the internet', () => {
    for (const labels of Object.values(LABELS)) {
      expect(labels.voiceBrowserHint.toLowerCase()).toMatch(/internet/);
      expect(labels.voiceHint.toLowerCase()).toMatch(/internet|browser/);
    }
  });
});

describe('composer voice input, Capacitor hub path', () => {
  it('records on the phone and lets the hub write the words when native and hub voice are on', async () => {
    hooks.native = true;
    hooks.hubVoice = true;
    hooks.canRecord = true;
    hooks.recorder = { stop: async () => 'pcm', cancel: vi.fn() };
    const onTranscript = vi.fn();
    const onNotice = vi.fn();
    renderVoice('tl', onTranscript, onNotice);
    await Promise.resolve();
    await Promise.resolve();
    const start = renderVoice('tl', onTranscript, onNotice);
    expect(start.button.props.title).toContain(LABELS.tl.voiceHubHint);

    start.button.props.onClick();
    await settle();
    expect(mode()).toBe('recording');

    const stop = renderVoice('tl', onTranscript, onNotice);
    expect(stop.button.props['aria-label']).toBe(LABELS.tl.voiceStop);
    stop.button.props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onNotice).toHaveBeenCalledWith(LABELS.tl.voiceWorking);
    expect(onTranscript).toHaveBeenCalledWith('nanilaw ang dahon');
    expect(mode()).toBe('idle');
  });

  it('does not use browser speech on native when hub voice is on', async () => {
    hooks.native = true;
    hooks.hubVoice = true;
    hooks.canRecord = true;
    hooks.canBrowserSpeech = true;
    hooks.recorder = { stop: async () => 'pcm', cancel: vi.fn() };
    const { button } = renderVoice();
    button.props.onClick();
    await settle();
    expect(hooks.browserStart).toBeNull();
    expect(mode()).toBe('recording');
  });

  it('says unavailable on native when hub voice is off', async () => {
    hooks.native = true;
    hooks.canRecord = true;
    hooks.canBrowserSpeech = true;
    const { button, onNotice } = renderVoice();
    button.props.onClick();
    await settle();
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.tl.voiceUnavailable);
    expect(hooks.browserStart).toBeNull();
  });

  it('asks the hub again on a tap, so joining its Wi-Fi after the page opened works', async () => {
    hooks.native = true;
    hooks.canRecord = true;
    hooks.recorder = { stop: async () => 'pcm', cancel: vi.fn() };
    const first = renderVoice();
    await settle();
    hooks.hubVoice = true;
    first.button.props.onClick();
    await settle();
    expect(mode()).toBe('recording');
  });

  it('says the microphone is unavailable when the phone cannot record', async () => {
    hooks.native = true;
    hooks.hubVoice = true;
    const { button, onNotice } = renderVoice('en');
    button.props.onClick();
    await settle();
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.en.voiceDenied);
    expect(mode()).toBe('idle');
  });

  it('says so when the hub heard nothing', async () => {
    hooks.native = true;
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
    await settle();
    renderVoice('tl', onTranscript, onNotice).button.props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.tl.voiceEmpty);
    expect(onTranscript).not.toHaveBeenCalled();
  });
});

describe('composer voice input, phone speech recognizer', () => {
  it('uses the phone recognizer in the app, before the hub', async () => {
    hooks.native = true;
    hooks.nativeSpeech = true;
    hooks.hubVoice = true;
    hooks.canRecord = true;
    const onTranscript = vi.fn();
    const { button } = renderVoice('tl', onTranscript);
    button.props.onClick();
    await settle();
    expect(mode()).toBe('recording');
    expect(hooks.nativeStart).not.toBeNull();
    expect(hooks.browserStart).toBeNull();
    hooks.nativeStart?.onInterim?.('may uod');
    hooks.nativeStart?.onFinal('may uod sa mais');
    hooks.nativeStart?.onEnd();
    expect(onTranscript).toHaveBeenCalledWith('may uod sa mais');
    expect(mode()).toBe('idle');
  });

  it('falls back to the hub when the phone recognizer has no internet', async () => {
    hooks.native = true;
    hooks.nativeSpeech = true;
    hooks.hubVoice = true;
    hooks.canRecord = true;
    hooks.recorder = { stop: async () => 'pcm', cancel: vi.fn() };
    const { button } = renderVoice();
    button.props.onClick();
    await settle();
    hooks.nativeStart?.onError('offline');
    hooks.nativeStart?.onEnd();
    await settle();
    expect(mode()).toBe('recording');
    expect(hooks.states[2]).toBe('hub');
  });

  it('says voice needs the internet when there is no hub to fall back on', async () => {
    hooks.native = true;
    hooks.nativeSpeech = true;
    const { button, onNotice } = renderVoice();
    button.props.onClick();
    await settle();
    hooks.nativeStart?.onError('offline');
    hooks.nativeStart?.onEnd();
    await settle();
    expect(onNotice).toHaveBeenLastCalledWith(LABELS.tl.voiceOffline);
    expect(mode()).toBe('idle');
  });
});

describe('composer voice input, browser without SpeechRecognition', () => {
  it('falls back to the hub recorder when hub voice is on', async () => {
    hooks.canBrowserSpeech = false;
    hooks.hubVoice = true;
    hooks.canRecord = true;
    hooks.recorder = { stop: async () => 'pcm', cancel: vi.fn() };
    const { button } = renderVoice();
    button.props.onClick();
    await settle();
    expect(mode()).toBe('recording');
    expect(hooks.browserStart).toBeNull();
  });
});
