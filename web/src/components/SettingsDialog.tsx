import { useEffect } from 'react';
import { DEFAULT_HUB_URL, saveHubUrl } from '../config/hub';
import type { Labels } from '../config/labels';

export interface SettingsDialogProps {
  labels: Labels;
  hubUrl: string;
  hubOnline: boolean | null;
  onHubUrl: (url: string) => void;
  onSyncNow: () => void;
  onClose: () => void;
}

/** Hub address and manual sync. Kept out of the chat so the thread stays a plain conversation. Preparing the phone AI is in the help dialog. */
export function SettingsDialog({ labels, hubUrl, hubOnline, onHubUrl, onSyncNow, onClose }: SettingsDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className='fixed inset-0 z-20 flex items-end justify-center bg-ink/30 p-4 sm:items-center'
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-label={labels.settings}
        className='max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-rule bg-surface p-5 text-ink shadow-xl'
      >
        <div className='mb-4 flex items-center justify-between gap-4'>
          <h2 className='m-0 text-xl font-bold'>{labels.settings}</h2>
          <button type='button' className='chat-icon-button' onClick={onClose} aria-label={labels.close} title={labels.close}>
            <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
              <path d='m6 6 12 12M6 18 18 6' />
            </svg>
          </button>
        </div>

        <section className='grid gap-3'>
          <h3 className='m-0 text-base font-semibold'>{labels.hubHeading}</h3>
          <label className='field text-label'>
            {labels.hubUrlLabel}
            <input
              className='input min-h-12 bg-white font-normal text-ink'
              type='url'
              inputMode='url'
              placeholder={DEFAULT_HUB_URL || 'http://192.168.1.10:8787'}
              defaultValue={hubUrl}
              onBlur={(e) => {
                saveHubUrl(e.target.value);
                onHubUrl(e.target.value.trim().replace(/\/+$/, ''));
              }}
            />
          </label>
          {hubUrl && hubOnline !== null && (
            <p className='m-0 flex items-center gap-2 text-sm text-mist' role='status'>
              <span className={`size-2 shrink-0 rounded-full ${hubOnline ? 'bg-leaf' : 'bg-muted'}`} aria-hidden='true' />
              {hubOnline ? labels.hubOnline : labels.hubOffline}
            </p>
          )}
          <button type='button' className='btn btn-secondary min-h-12 justify-self-start' onClick={onSyncNow} disabled={!hubUrl}>
            {labels.hubSyncNow}
          </button>
        </section>
      </div>
    </div>
  );
}
