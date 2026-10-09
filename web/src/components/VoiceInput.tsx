import { useEffect, useRef, useState } from 'react';
import { L } from '../config/labels';

// The Web Speech API is missing from TypeScript's DOM types, so the parts used here are typed by hand.
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
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

/** Mic button for the composer. Speaks the question into the text box. Renders nothing on browsers without the Web Speech API. */
export function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported] = useState(() => speechRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognition.current?.stop(), []);

  if (!supported) return null;

  function start() {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'fil-PH';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const text = Array.from(event.results, (r) => r[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) onTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognition.current = rec;
    rec.start();
    setListening(true);
  }

  function stop() {
    recognition.current?.stop();
    setListening(false);
  }

  return (
    <button
      type="button"
      className={`icon-btn ${listening ? 'animate-pulse bg-soft text-accent' : ''}`}
      onClick={listening ? stop : start}
      aria-label={listening ? L.voiceStop : L.voiceStart}
      aria-pressed={listening}
      title={L.voiceHint}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}
