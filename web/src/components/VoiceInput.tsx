import { useEffect, useRef, useState } from 'react';
import { localeFor, type Labels, type UiLanguage } from '../config/labels';

// The Web Speech API is missing from TypeScript's DOM types.
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

interface VoiceInputProps {
  labels: Labels;
  language: UiLanguage;
  onTranscript: (text: string) => void;
  onNotice: (notice: string) => void;
}

export function VoiceInput({ labels, language, onTranscript, onNotice }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const transcriptCallback = useRef(onTranscript);
  transcriptCallback.current = onTranscript;

  useEffect(() => {
    setListening(false);
    return () => {
      const rec = recognition.current;
      if (!rec) return;
      rec.onresult = rec.onerror = rec.onend = null;
      rec.abort();
      recognition.current = null;
    };
  }, [language]);

  function start() {
    if (recognition.current) return;
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
        setListening(false);
        onNotice(event.error === 'aborted' ? '' : labels.voiceError);
      };
      rec.onend = () => {
        recognition.current = null;
        setListening(false);
        if (!failed) onNotice('');
      };
      recognition.current = rec;
      rec.start();
      setListening(true);
      onNotice(labels.voiceListening);
    } catch {
      recognition.current = null;
      setListening(false);
      onNotice(labels.voiceError);
    }
  }

  function stop() {
    recognition.current?.stop();
  }

  return (
    <button
      type='button'
      className={`chat-icon-button ${listening ? 'bg-leaf text-white' : ''}`}
      aria-label={listening ? labels.voiceStop : labels.voiceStart}
      aria-pressed={listening}
      title={listening ? labels.voiceStop : `${labels.voiceStart}. ${labels.voiceHint}`}
      onClick={listening ? stop : start}
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
