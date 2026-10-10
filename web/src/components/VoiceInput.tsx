import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import type { Labels, UiLanguage } from '../config/labels';
import {
  canUseBrowserSpeech,
  speechLangCandidates,
  startBrowserSpeech,
  type BrowserSpeechError,
  type BrowserSpeechHandle,
  type SpeechSessionOptions,
} from '../lib/browser-speech';
import { canUseNativeSpeech, startNativeSpeech } from '../lib/native-speech';
import { hubCapabilities, transcribeOnHub } from '../lib/sync';
import { canRecord, startRecorder, type Recorder } from '../lib/recorder';
import { VoiceOverlay } from './VoiceOverlay';

type Mode = 'idle' | 'recording' | 'working';
type Path = 'hub' | 'browser' | 'native' | null;

interface VoiceInputProps {
  labels: Labels;
  language: UiLanguage;
  hubUrl: string;
  onTranscript: (text: string) => void;
  onNotice: (notice: string) => void;
  /** Shows the action's name beside the icon, for the farmer who does not know what the bare icon does. */
  labeled?: boolean;
  /** Extra classes for the visible label, so the page can collapse it to icon-only on a narrow composer row. */
  labelClass?: string;
}

/**
 * Mic button for the composer. Speaks the question into the text box; the farmer checks the words before sending.
 * Listening ends by itself when the farmer stops talking.
 *
 * Android app: the phone's own speech recognizer (fast, words appear as they speak). Browser/PWA: Web Speech API
 * (needs internet in Chrome). When neither works — no recognizer, or no internet — the phone records and the hub
 * writes it down, when hub voice is on.
 */
export function VoiceInput({ labels, language, hubUrl, onTranscript, onNotice, labeled = false, labelClass = '' }: VoiceInputProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [hubVoice, setHubVoice] = useState(false);
  const [path, setPath] = useState<Path>(null);
  const [liveText, setLiveText] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const recorder = useRef<Recorder | null>(null);
  const speech = useRef<BrowserSpeechHandle | null>(null);
  const speechSession = useRef(0);
  const pathRef = useRef<Path>(null);
  const modeRef = useRef<Mode>('idle');
  const transcriptCallback = useRef(onTranscript);
  transcriptCallback.current = onTranscript;
  const noticeCallback = useRef(onNotice);
  noticeCallback.current = onNotice;
  /** Mic level for the overlay's meter, written many times a second without re-rendering. */
  const level = useRef(0);
  const nativeSpeech = useRef(false);

  function setModeBoth(next: Mode) {
    modeRef.current = next;
    setMode(next);
  }

  function setPathBoth(next: Path) {
    pathRef.current = next;
    setPath(next);
  }

  useEffect(() => {
    let cancelled = false;
    void hubCapabilities(hubUrl).then((caps) => {
      if (!cancelled) setHubVoice(caps?.voice === true);
    });
    return () => {
      cancelled = true;
    };
  }, [hubUrl]);

  useEffect(() => {
    // Ask once up front, so the tap starts listening at once.
    void canUseNativeSpeech().then((ok) => {
      nativeSpeech.current = ok;
    });
  }, []);

  useEffect(() => {
    setModeBoth('idle');
    setPathBoth(null);
    setLiveText('');
    return () => {
      recorder.current?.cancel();
      recorder.current = null;
      speechSession.current += 1;
      speech.current?.abort();
      speech.current = null;
    };
  }, [language]);

  function closeOverlay() {
    setModeBoth('idle');
    setPathBoth(null);
    setLiveText('');
    setSpeaking(false);
    level.current = 0;
  }

  async function finishHubRecording() {
    const active = recorder.current;
    if (!active) return;
    recorder.current = null;
    try {
      const audio = await active.stop();
      if (audio === null) {
        noticeCallback.current(labels.voiceEmpty);
        closeOverlay();
        return;
      }
      setModeBoth('working');
      level.current = 0;
      noticeCallback.current(labels.voiceWorking);
      const result = await transcribeOnHub(hubUrl, audio);
      if (result.status === 'ok' && result.text) {
        transcriptCallback.current(result.text);
        noticeCallback.current('');
      } else {
        noticeCallback.current(result.status === 'empty' ? labels.voiceEmpty : labels.voiceFailed);
      }
    } catch {
      noticeCallback.current(labels.voiceFailed);
    } finally {
      closeOverlay();
    }
  }

  async function startHubRecording() {
    try {
      setPathBoth('hub');
      setModeBoth('recording');
      setLiveText('');
      noticeCallback.current('');
      recorder.current = await startRecorder(
        () => void finishHubRecording(),
        () => void finishHubRecording(),
        (value) => {
          level.current = value;
        },
      );
    } catch {
      closeOverlay();
      noticeCallback.current(labels.voiceDenied);
    }
  }

  /** Listening through the phone's recognizer or the browser's; both report the same way. */
  function startSpeechPath(kind: 'browser' | 'native') {
    const session = ++speechSession.current;
    const current = () => speechSession.current === session;
    let failure: BrowserSpeechError | null = null;
    setPathBoth(kind);
    setModeBoth('recording');
    setLiveText('');
    setSpeaking(false);
    level.current = 0;
    noticeCallback.current('');

    const options: SpeechSessionOptions = {
      lang: speechLangCandidates(language),
      onInterim: (text) => {
        if (current()) setLiveText(text);
      },
      onSpeaking: (value) => {
        if (current()) setSpeaking(value);
      },
      onLevel: (value) => {
        if (current()) level.current = value;
      },
      onFinal: (text) => {
        if (!current()) return;
        transcriptCallback.current(text);
        noticeCallback.current('');
      },
      onError: (error) => {
        if (!current()) return;
        failure = error;
        if (error !== 'offline') {
          const message = error === 'denied' ? labels.voiceDenied : error === 'empty' ? labels.voiceEmpty : labels.voiceFailed;
          noticeCallback.current(message);
        }
      },
      onEnd: () => {
        if (!current()) return;
        speech.current = null;
        closeOverlay();
        // No internet (or no language pack): let the hub write it down instead, when it can.
        if (failure === 'offline') void fallBackToHub();
      },
    };
    speech.current = kind === 'native' ? startNativeSpeech(options) : startBrowserSpeech(options);
  }

  async function fallBackToHub() {
    if ((await probeHubVoice()) && canRecord() && modeRef.current === 'idle') {
      void startHubRecording();
      return;
    }
    noticeCallback.current(labels.voiceOffline);
  }

  function stopCurrent() {
    // Prefer the live handle over React state — state can lag one frame behind the overlay button.
    if (speech.current) {
      speech.current.stop();
      return;
    }
    if (pathRef.current === 'hub' && modeRef.current === 'recording') {
      void finishHubRecording();
    }
  }

  function dismissCurrent() {
    if (speech.current || pathRef.current === 'browser' || pathRef.current === 'native') {
      speechSession.current += 1;
      speech.current?.abort();
      speech.current = null;
      closeOverlay();
      onNotice('');
      return;
    }
    if (pathRef.current === 'hub' && modeRef.current === 'recording') {
      recorder.current?.cancel();
      recorder.current = null;
      closeOverlay();
      onNotice('');
    }
  }

  async function probeHubVoice(): Promise<boolean> {
    const voice = hubVoice || (await hubCapabilities(hubUrl))?.voice === true;
    if (voice !== hubVoice) setHubVoice(voice);
    return voice;
  }

  async function onClick() {
    if (modeRef.current === 'recording') {
      stopCurrent();
      return;
    }
    if (modeRef.current !== 'idle') return;
    onNotice('');

    const native = Capacitor.isNativePlatform();

    // Start at once (no await when it can be helped) so the first word is not missed.
    if (native && (nativeSpeech.current || (await canUseNativeSpeech()))) {
      if (modeRef.current !== 'idle') return;
      nativeSpeech.current = true;
      startSpeechPath('native');
      return;
    }
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!native && canUseBrowserSpeech() && !(offline && hubVoice)) {
      startSpeechPath('browser');
      return;
    }

    const voice = await probeHubVoice();
    if (modeRef.current !== 'idle') return;

    if (!canRecord()) {
      onNotice(labels.voiceDenied);
      return;
    }
    if (voice) void startHubRecording();
    else onNotice(labels.voiceUnavailable);
  }

  const listening = mode === 'recording';
  const working = mode === 'working';
  const overlayOpen = mode === 'recording' || mode === 'working';
  const hint =
    Capacitor.isNativePlatform() && hubVoice
      ? labels.voiceHubHint
      : canUseBrowserSpeech()
        ? labels.voiceBrowserHint
        : labels.voiceHint;
  const workingLabel = path === 'hub' || pathRef.current === 'hub' ? labels.voiceWorking : labels.voiceSpeakNow;

  return (
    <>
      <button
        type='button'
        className={`${labeled ? 'chat-action-button' : 'chat-icon-button'} ${listening ? 'bg-leaf text-white' : ''} ${working ? 'opacity-50' : ''}`}
        onClick={() => void onClick()}
        disabled={working}
        aria-label={working ? workingLabel : listening ? labels.voiceStop : labels.voiceStart}
        aria-pressed={listening}
        aria-busy={working}
        title={listening ? labels.voiceStop : `${labels.voiceStart}. ${hint}`}
      >
        {listening ? (
          <svg className='size-5' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <rect x='6' y='6' width='12' height='12' rx='3' />
          </svg>
        ) : (
          <svg className='size-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
            <rect x='9' y='2' width='6' height='12' rx='3' />
            <path d='M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8' />
          </svg>
        )}
        {labeled && <span className={labelClass}>{listening ? labels.voiceStop : labels.voiceStart}</span>}
      </button>
      <VoiceOverlay
        open={overlayOpen}
        labels={labels}
        phase={working ? 'working' : 'listening'}
        workingLabel={workingLabel}
        liveText={liveText}
        speaking={speaking}
        level={level}
        onStop={stopCurrent}
        onDismiss={dismissCurrent}
      />
    </>
  );
}
