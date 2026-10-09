import { useEffect, useRef, useState } from 'react';
import type { Labels, UiLanguage } from '../config/labels';
import { hubCapabilities, transcribeOnHub } from '../lib/sync';
import { canRecord, startRecorder, type Recorder } from '../lib/recorder';

type Mode = 'idle' | 'recording' | 'working';

interface VoiceInputProps {
  labels: Labels;
  language: UiLanguage;
  hubUrl: string;
  onTranscript: (text: string) => void;
  onNotice: (notice: string) => void;
}

/**
 * Mic button for the composer. Speaks the question into the text box, and the farmer checks the words before sending.
 *
 * Local only: the phone records (up to 30 seconds) and the hub's audio model writes it down over the hub's Wi-Fi. It
 * reads Tagalog, Taglish, Cebuano, and English. The browser's own speech service is never used, because it sends the
 * audio to the internet. Without a hub that transcribes, the button says so and the farmer types instead.
 */
export function VoiceInput({ labels, language, hubUrl, onTranscript, onNotice }: VoiceInputProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [hubVoice, setHubVoice] = useState(false);
  const recorder = useRef<Recorder | null>(null);
  const transcriptCallback = useRef(onTranscript);
  transcriptCallback.current = onTranscript;

  // Ask the hub, once per address, whether it writes speech down.
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
    setMode('idle');
    return () => {
      recorder.current?.cancel();
      recorder.current = null;
    };
  }, [language]);

  async function finishRecording() {
    const active = recorder.current;
    if (!active) return;
    recorder.current = null;
    setMode('working');
    onNotice(labels.voiceWorking);
    try {
      const audio = await active.stop();
      if (audio === null) {
        // Nothing but room noise: no need to wait for the hub to say so.
        onNotice(labels.voiceEmpty);
        return;
      }
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
      setMode('idle');
    }
  }

  async function startRecording() {
    try {
      recorder.current = await startRecorder(
        () => void finishRecording(),
        () => void finishRecording(),
      );
      setMode('recording');
      onNotice(labels.voiceRecording);
    } catch {
      // The farmer refused the microphone, or this device has none.
      setMode('idle');
      onNotice(labels.voiceDenied);
    }
  }

  async function onClick() {
    if (mode === 'recording') {
      void finishRecording();
      return;
    }
    if (mode !== 'idle') return;
    onNotice('');
    if (!canRecord()) {
      onNotice(labels.voiceDenied);
      return;
    }
    // Ask the hub again: the farmer may have joined its Wi-Fi since the page opened.
    const voice = hubVoice || (await hubCapabilities(hubUrl))?.voice === true;
    if (voice !== hubVoice) setHubVoice(voice);
    if (voice) void startRecording();
    else onNotice(labels.voiceUnavailable);
  }

  const listening = mode === 'recording';
  const working = mode === 'working';
  return (
    <button
      type='button'
      className={`chat-icon-button ${listening ? 'animate-pulse bg-leaf text-white' : ''} ${working ? 'opacity-50' : ''}`}
      onClick={() => void onClick()}
      disabled={working}
      aria-label={working ? labels.voiceWorking : listening ? labels.voiceStop : labels.voiceStart}
      aria-pressed={listening}
      aria-busy={working}
      title={listening ? labels.voiceStop : `${labels.voiceStart}. ${hubVoice ? labels.voiceHubHint : labels.voiceHint}`}
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
  );
}
