import { useEffect, useRef, type CSSProperties } from 'react';
import type { Labels } from '../config/labels';

export type VoiceOverlayPhase = 'listening' | 'working';

interface VoiceOverlayProps {
  open: boolean;
  labels: Labels;
  phase: VoiceOverlayPhase;
  /** Copy while phase is working (hub transcribe vs browser finishing). */
  workingLabel?: string;
  /** Live words while listening. */
  liveText?: string;
  /** True while the recognizer hears speech. */
  speaking?: boolean;
  /** Mic level, 0 to 1, updated many times a second by the voice session. */
  level?: { current: number };
  onStop: () => void;
  onDismiss: () => void;
}

const BARS = 7;

/**
 * Listening sheet: what the farmer has said so far, a mic that moves with their voice, and Done / Cancel.
 * Listening also ends by itself when they stop talking.
 */
export function VoiceOverlay({
  open,
  labels,
  phase,
  workingLabel,
  liveText = '',
  speaking = false,
  level,
  onStop,
  onDismiss,
}: VoiceOverlayProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const listening = phase === 'listening';

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  useEffect(() => {
    if (open && listening) doneButton.current?.focus({ preventScroll: true });
  }, [open, listening]);

  // Drives the meter from the live level without re-rendering React.
  useEffect(() => {
    const node = sheet.current;
    if (!open || !listening || !node) return;
    let smooth = 0;
    let frame = 0;
    const tick = (time: number) => {
      let target = level?.current ?? 0;
      // No meter on this device (phone browsers): move while the recognizer hears speech.
      if (target < 0.04 && speakingRef.current) target = 0.45 + 0.2 * Math.sin(time / 160);
      smooth += (target - smooth) * (target > smooth ? 0.45 : 0.12);
      node.style.setProperty('--voice-level', smooth.toFixed(3));
      for (let i = 0; i < BARS; i++) {
        const wave = 0.55 + 0.45 * Math.sin(time / 130 + i * 1.7);
        const centre = 1 - Math.abs(i - (BARS - 1) / 2) / BARS;
        node.style.setProperty(`--voice-bar-${i}`, Math.max(0.14, smooth * wave * (0.6 + centre)).toFixed(3));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.style.setProperty('--voice-level', '0');
    };
  }, [open, listening, level]);

  if (!open) return null;

  const busyLabel = workingLabel ?? labels.voiceWorking;
  const words = liveText.trim();
  const status = listening ? (speaking || words ? labels.voiceHearing : labels.voiceListening) : busyLabel;

  return (
    <div className='voice-overlay' role='dialog' aria-modal='true' aria-label={listening ? labels.voiceSpeakNow : busyLabel} onClick={onDismiss}>
      <div
        ref={sheet}
        className={`voice-sheet ${speaking ? 'voice-sheet--speaking' : ''} ${listening ? '' : 'voice-sheet--working'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <p className='voice-status' role='status'>
          <span className='voice-status-dot' aria-hidden='true' />
          {status}
        </p>

        <p className={`voice-words ${words ? '' : 'voice-words--empty'}`} aria-live='polite'>
          {words || (listening ? labels.voiceSpeakNow : '')}
        </p>

        <div className='voice-meter'>
          {listening && (
            <div className='voice-bars' aria-hidden='true'>
              {Array.from({ length: BARS }, (_, i) => (
                <span key={i} style={{ '--voice-bar': `var(--voice-bar-${i}, 0.14)` } as CSSProperties} />
              ))}
            </div>
          )}
          <button
            type='button'
            className='voice-orb'
            aria-label={listening ? labels.voiceStop : busyLabel}
            disabled={!listening}
            onClick={() => {
              if (listening) onStop();
            }}
          >
            <span className='voice-orb-halo' aria-hidden='true' />
            {listening ? (
              <svg className='voice-orb-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' aria-hidden='true'>
                <rect x='9' y='2.5' width='6' height='11.5' rx='3' fill='currentColor' />
                <path d='M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1M12 18.5V21.5' />
              </svg>
            ) : (
              <span className='voice-spinner' aria-hidden='true' />
            )}
          </button>
          {listening && (
            <div className='voice-bars voice-bars--mirror' aria-hidden='true'>
              {Array.from({ length: BARS }, (_, i) => (
                <span key={i} style={{ '--voice-bar': `var(--voice-bar-${BARS - 1 - i}, 0.14)` } as CSSProperties} />
              ))}
            </div>
          )}
        </div>

        {listening && (
          <>
            <p className='voice-hint'>{labels.voiceAutoStop}</p>
            <div className='voice-actions'>
              <button type='button' className='voice-cancel' onClick={onDismiss}>
                {labels.voiceCancel}
              </button>
              <button ref={doneButton} type='button' className='voice-done' onClick={onStop}>
                <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                  <path d='m5 12.5 4.5 4.5L19 7.5' />
                </svg>
                {labels.voiceDone}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
