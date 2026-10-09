import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import type { Labels, UiLanguage } from '../config/labels';
import {
  canUseBrowserSpeech,
  speechLangCandidates,
  startBrowserSpeech,
  type BrowserSpeechHandle,
} from '../lib/browser-speech';
import { hubCapabilities, transcribeOnHub } from '../lib/sync';
import { canRecord, startRecorder, type Recorder } from '../lib/recorder';
import { VoiceOverlay } from './VoiceOverlay';

type Mode = 'idle' | 'recording' | 'working';
type Path = 'hub' | 'browser' | null;

interface VoiceInputProps {
  labels: Labels;
  language: UiLanguage;
  hubUrl: string;
  onTranscript: (text: string) => void;
  onNotice: (notice: string) => void;
}

/**
 * Mic button for the composer. Speaks the question into the text box; the farmer checks the words before sending.
 *
 * Browser/PWA: Web Speech API (needs internet in Chrome). Capacitor native (or browser without SpeechRecognition):
 * phone records and the hub writes it down when hub voice is on.
 */
export function VoiceInput({ labels, language, hubUrl, onTranscript, onNotice }: VoiceInputProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [hubVoice, setHubVoice] = useState(false);
  const [path, setPath] = useState<Path>(null);
  const [liveText, setLiveText] = useState('');
  const recorder = useRef<Recorder | null>(null);
  const browserSpeech = useRef<BrowserSpeechHandle | null>(null);
  const browserSession = useRef(0);
  const pathRef = useRef<Path>(null);
  const modeRef = useRef<Mode>('idle');
  const transcriptCallback = useRef(onTranscript);
  transcriptCallback.current = onTranscript;
  const noticeCallback = useRef(onNotice);
  noticeCallback.current = onNotice;

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
    setModeBoth('idle');
    setPathBoth(null);
    setLiveText('');
    return () => {
      recorder.current?.cancel();
      recorder.current = null;
      browserSpeech.current?.abort();
      browserSpeech.current = null;
    };
  }, [language]);

  function closeOverlay() {
    setModeBoth('idle');
    setPathBoth(null);
    setLiveText('');
  }

  async function finishHubRecording() {
    const active = recorder.current;
    if (!active) return;
    recorder.current = null;
    try {
      const audio = await active.stop();
      if (audio === null) {
        onNotice(labels.voiceEmpty);
        closeOverlay();
        return;
      }
      setModeBoth('working');
      onNotice(labels.voiceWorking);
      const result = await transcribeOnHub(hubUrl, audio);
      if (result.status === 'ok' && result.text) {
        transcriptCallback.current(result.text);
        onNotice('');
      } else {
        onNotice(result.status === 'empty' ? labels.voiceEmpty : labels.voiceFailed);
      }
    } catch {
      onNotice(labels.voiceFailed);
    } finally {
      closeOverlay();
    }
  }

  async function startHubRecording() {
    try {
      setPathBoth('hub');
      setModeBoth('recording');
      onNotice('');
      recorder.current = await startRecorder(
        () => void finishHubRecording(),
        () => void finishHubRecording(),
      );
    } catch {
      closeOverlay();
      onNotice(labels.voiceDenied);
    }
  }

  function startBrowserPath() {
    const session = ++browserSession.current;
    setPathBoth('browser');
    setModeBoth('recording');
    setLiveText('');
    onNotice('');

    browserSpeech.current = startBrowserSpeech({
      lang: speechLangCandidates(language),
      onInterim: (text) => {
        if (browserSession.current !== session) return;
        setLiveText(text);
      },
      onFinal: (text) => {
        if (browserSession.current !== session) return;
        transcriptCallback.current(text);
        noticeCallback.current('');
      },
      onError: (kind) => {
        if (browserSession.current !== session) return;
        const message =
          kind === 'denied' ? labels.voiceDenied : kind === 'empty' ? labels.voiceEmpty : labels.voiceFailed;
        noticeCallback.current(message);
      },
      onEnd: () => {
        if (browserSession.current !== session) return;
        browserSpeech.current = null;
        closeOverlay();
      },
    });
  }

  function stopCurrent() {
    // Prefer the live handle over React state — state can lag one frame behind the overlay button.
    if (browserSpeech.current || pathRef.current === 'browser') {
      browserSpeech.current?.stop();
      return;
    }
    if (pathRef.current === 'hub' && modeRef.current === 'recording') {
      void finishHubRecording();
    }
  }

  function dismissCurrent() {
    if (browserSpeech.current || pathRef.current === 'browser') {
      browserSession.current += 1;
      browserSpeech.current?.abort();
      browserSpeech.current = null;
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

    // Browser STT does not need the hub — start immediately (no await) so speech is not missed.
    if (!native && canUseBrowserSpeech()) {
      startBrowserPath();
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
        className={`chat-icon-button ${listening ? 'animate-pulse bg-leaf text-white' : ''} ${working ? 'opacity-50' : ''}`}
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
      </button>
      <VoiceOverlay
        open={overlayOpen}
        labels={labels}
        phase={working ? 'working' : 'listening'}
        workingLabel={workingLabel}
        liveText={liveText}
        onStop={stopCurrent}
        onDismiss={dismissCurrent}
      />
    </>
  );
}
