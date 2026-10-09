import { useEffect } from 'react';
import type { Labels } from '../config/labels';

export type VoiceOverlayPhase = 'listening' | 'working';

interface VoiceOverlayProps {
  open: boolean;
  labels: Labels;
  phase: VoiceOverlayPhase;
  /** Copy while phase is working (hub transcribe vs browser finishing). */
  workingLabel?: string;
  /** Live interim/final text while listening (browser STT). */
  liveText?: string;
  onStop: () => void;
  onDismiss: () => void;
}

/**
 * Full-bleed listening UI (Google-style type-by-voice): dark scrim, "Speak now", large mic with ripple.
 */
export function VoiceOverlay({
  open,
  labels,
  phase,
  workingLabel,
  liveText = '',
  onStop,
  onDismiss,
}: VoiceOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  const listening = phase === 'listening';
  const busyLabel = workingLabel ?? labels.voiceWorking;
  const prompt = listening ? (liveText.trim() || labels.voiceSpeakNow) : busyLabel;

  return (
    <div
      className='voice-overlay'
      role='dialog'
      aria-modal='true'
      aria-label={listening ? labels.voiceSpeakNow : busyLabel}
      aria-live='polite'
      onClick={onDismiss}
    >
      <p
        className={`voice-overlay-prompt ${liveText.trim() ? 'voice-overlay-prompt--live' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        {prompt}
      </p>
      <button
        type='button'
        className={`voice-overlay-mic ${listening ? 'voice-overlay-mic--listening' : ''}`}
        aria-label={listening ? labels.voiceStop : busyLabel}
        onClick={(event) => {
          event.stopPropagation();
          if (listening) onStop();
        }}
      >
        {listening && (
          <>
            <span className='voice-overlay-ripple' aria-hidden='true' />
            <span className='voice-overlay-ripple voice-overlay-ripple--delay' aria-hidden='true' />
          </>
        )}
        <span className='voice-overlay-mic-icon' aria-hidden='true'>
          <svg viewBox='0 0 24 24' fill='currentColor'>
            <rect x='9' y='2' width='6' height='12' rx='3' />
            <path d='M5 10v2a7 7 0 0 0 14 0v-2' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' />
            <path d='M12 19v3M8 22h8' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' />
          </svg>
        </span>
      </button>
    </div>
  );
}
