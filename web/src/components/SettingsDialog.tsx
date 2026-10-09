import { useEffect } from 'react';
import { DEFAULT_HUB_URL, saveHubUrl } from '../config/hub';
import { L } from '../config/labels';
import { PHONE_MODEL } from '../config/models';
import type { PhoneAiState } from '../lib/llm';
import { phoneAi } from '../lib/llm';

export interface SettingsDialogProps {
  ai: PhoneAiState;
  hubUrl: string;
  hubOnline: boolean | null;
  onHubUrl: (url: string) => void;
  onSyncNow: () => void;
  onClose: () => void;
}

/** Phone AI and hub settings. Kept out of the chat so the thread stays a plain conversation. */
export function SettingsDialog({ ai, hubUrl, hubOnline, onHubUrl, onSyncNow, onClose }: SettingsDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const aiLabel =
    ai.status === 'idle'
      ? L.phoneAiIdle
      : ai.status === 'loading'
        ? L.phoneAiLoading
        : ai.status === 'ready'
          ? L.phoneAiReady
          : L.phoneAiError;

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={L.settings}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 font-serif text-xl font-medium">{L.settings}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={L.close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <section className="grid gap-2 border-b border-line pb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="text-sm font-medium">{L.phoneAiHeading}:</strong> <span className="text-sm">{aiLabel}</span>
            </div>
            {(ai.status === 'idle' || ai.status === 'error') && (
              <button className="pill-btn" onClick={() => phoneAi.load()}>
                {L.phoneAiPrepare}
              </button>
            )}
          </div>
          {ai.progress && <p className="m-0 text-[0.8125rem] text-muted">{ai.progress}</p>}
          {ai.status === 'ready' && (
            <p className="m-0 text-[0.8125rem] text-muted">
              {L.phoneAiDevice} {ai.device}. {PHONE_MODEL.id.split('/')[1]}
            </p>
          )}
          {ai.status === 'error' && <p className="m-0 text-[0.8125rem] text-muted">{ai.error}</p>}
        </section>

        <section className="grid gap-2 pt-5">
          <h3 className="m-0 text-sm font-medium">{L.hubHeading}</h3>
          <label className="field-label text-muted">
            {L.hubUrlLabel}
            <input
              className="text-input text-ink"
              type="url"
              inputMode="url"
              placeholder={DEFAULT_HUB_URL || 'http://192.168.1.10:8787'}
              defaultValue={hubUrl}
              onBlur={(e) => {
                saveHubUrl(e.target.value);
                onHubUrl(e.target.value.trim().replace(/\/+$/, ''));
              }}
            />
          </label>
          {hubUrl && hubOnline !== null && (
            <p className="m-0 flex items-center gap-2 text-[0.8125rem] text-muted">
              <span className={`size-2 shrink-0 rounded-full ${hubOnline ? 'bg-green-600' : 'bg-muted'}`} aria-hidden="true" />
              {hubOnline ? L.hubOnline : L.hubOffline}
            </p>
          )}
          <button className="pill-btn justify-self-start" onClick={onSyncNow} disabled={!hubUrl}>
            {L.hubSyncNow}
          </button>
        </section>
      </div>
    </div>
  );
}
