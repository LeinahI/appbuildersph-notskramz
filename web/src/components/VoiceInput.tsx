import { useEffect, useRef, useState } from 'react';
import { localeFor, type Labels, type UiLanguage } from '../config/labels';
import { hubCapabilities, transcribeOnHub } from '../lib/sync';
import { canRecord, startRecorder, type Recorder } from '../lib/recorder';

// The Web Speech API is missing from TypeScript's DOM types, so the parts used here are typed by hand.
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Mode = 'idle' | 'recording' | 'working' | 'browser';

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
 * With a hub that transcribes speech, the phone records (up to 30 seconds) and the hub's local audio model writes it
 * down: no internet, and it reads Tagalog, Taglish, Cebuano, and English. Without one, it uses the browser's speech
 * service, which needs internet. The button always shows, and says why when the device has neither.
 */
export function VoiceInput({ labels, language, hubUrl, onTranscript, onNotice }: VoiceInputProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [hubVoice, setHubVoice] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
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
      const rec = recognition.current;
      if (rec) {
        rec.onresult = rec.onerror = rec.onend = null;
        rec.abort();
        recognition.current = null;
      }
      recorder.current?.cancel();
      recorder.current = null;
    };
  }, [language]);

  const hubRecording = hubVoice && canRecord();

  function startBrowser() {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      onNotice(labels.voiceUnavailable);
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = language === 'tl' ? 'fil-PH' : localeFor(language);
      rec.interimResults = false;
      rec.continuous = false;
      let failed = false;
      rec.onresult = (event) => {
        const text = Array.from(event.results, (result) => (result[0]?.transcript ?? '').trim())
          .filter(Boolean)
          .join(' ')
          .trim();
        if (text) transcriptCallback.current(text);
      };
      rec.onerror = (event) => {
        failed = true;
        setMode('idle');
        onNotice(event.error === 'aborted' ? '' : labels.voiceError);
      };
      rec.onend = () => {
        recognition.current = null;
        setMode('idle');
        if (!failed) onNotice('');
      };
      recognition.current = rec;
      rec.start();
      setMode('browser');
      onNotice(labels.voiceListening);
    } catch {
      recognition.current = null;
      setMode('idle');
      onNotice(labels.voiceError);
    }
  }

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

  function onClick() {
    if (mode === 'recording') void finishRecording();
    else if (mode === 'browser') recognition.current?.stop();
    else if (mode === 'idle') {
      onNotice('');
      // The hub's own audio model is preferred: it works offline.
      if (hubRecording) void startRecording();
      else startBrowser();
    }
  }

  const listening = mode === 'recording' || mode === 'browser';
  const working = mode === 'working';
  return (
    <button
      type='button'
      className={`chat-icon-button ${listening ? 'animate-pulse bg-leaf text-white' : ''} ${working ? 'opacity-50' : ''}`}
      onClick={onClick}
      disabled={working}
      aria-label={working ? labels.voiceWorking : listening ? labels.voiceStop : labels.voiceStart}
      aria-pressed={listening}
      aria-busy={working}
      title={listening ? labels.voiceStop : `${labels.voiceStart}. ${hubRecording ? labels.voiceHubHint : labels.voiceHint}`}
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
