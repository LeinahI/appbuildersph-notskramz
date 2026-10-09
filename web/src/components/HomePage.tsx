import { useEffect, useRef, type FormEvent, type ReactNode, type Ref } from 'react';
import { DEFAULT_UI_LANGUAGE, type Labels } from '../config/labels';
import { photoSrc } from '../lib/photo';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { VoiceInput } from './VoiceInput';

export interface HomePageProps {
  labels: Labels;
  text: string;
  notice: string;
  hubUrl: string;
  /** A photo chosen for the next question, as a base64 JPEG already shrunk for the hub. */
  photo: string | null;
  /** The chat so far. Without it the page shows the welcome screen. */
  children?: ReactNode;
  /** Shown under the welcome text, while the chat is empty. */
  suggestions?: ReactNode;
  /** Shown above the composer, for example the symptom picker opened during a chat. */
  tray?: ReactNode;
  /** The symptom picker toggle. Only offered once the chat has started. */
  symptomsOpen?: boolean;
  onSymptoms?: () => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onHistory: () => void;
  onHelp: () => void;
  /** Shown when the farmer is signed in with a claim link. */
  onLogout?: () => void;
  onNewConversation: () => void;
  onPhotoFile: (file: File | undefined) => void;
  onRemovePhoto: () => void;
  onNotice: (notice: string) => void;
  /** Scroll parent for the chat thread virtualizer. */
  mainRef?: Ref<HTMLElement>;
}

export function HomePage(props: HomePageProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const { labels } = props;
  const canSend = props.text.trim() !== '' || props.photo !== null;

  useEffect(() => {
    const input = textarea.current;
    if (!input) return;
    input.style.height = '0px';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [props.text]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSend) props.onSubmit();
  }

  function appendTranscript(transcript: string) {
    props.onTextChange([props.text.trim(), transcript].filter(Boolean).join(' '));
    textarea.current?.focus();
  }

  return (
    <div className='chat-shell'>
      <header className='chat-header relative'>
        <button
          type='button'
          className='chat-icon-button'
          aria-label={labels.historyLabel}
          title={labels.historyLabel}
          onClick={props.onHistory}
        >
          <img className='size-6' src='/home/history.svg' alt='' />
        </button>
        <img
          className='h-16 w-auto min-w-0 max-w-[96px] object-contain min-[400px]:max-w-[120px] sm:max-w-[160px] md:absolute md:left-1/2 md:-translate-x-1/2'
          src='/UgatanLogo.png'
          width={3504}
          height={1827}
          alt={labels.appName}
        />
        <div className='flex items-center md:ml-auto'>
          <button
            type='button'
            className='chat-icon-button bg-leaf-soft'
            aria-label={labels.newConversationLabel}
            title={labels.newConversationLabel}
            onClick={props.onNewConversation}
          >
            <img className='size-6' src='/home/new-chat.svg' alt='' />
          </button>
          {props.onLogout && (
            <LogoutConfirmDialog
              triggerClassName='chat-icon-button bg-leaf-soft'
              copy={{
                label: labels.logoutLabel,
                title: labels.logoutConfirmTitle,
                body: labels.logoutConfirmBody,
                confirm: labels.logoutConfirmYes,
                cancel: labels.logoutConfirmNo,
              }}
              onConfirm={props.onLogout}
              trigger={
                <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                  <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' />
                </svg>
              }
            />
          )}
          <button
            type='button'
            className='chat-icon-button'
            aria-label={labels.helpLabel}
            title={labels.helpLabel}
            aria-haspopup='dialog'
            aria-controls='ugatan-help-dialog'
            onClick={props.onHelp}
          >
            <img className='size-5' src='/home/help.svg' alt='' />
          </button>
        </div>
      </header>

      <main ref={props.mainRef} className='chat-main'>
        {props.children ? (
          <div className='chat-content py-6 md:py-10'>{props.children}</div>
        ) : (
          <section className='chat-content flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center'>
            <div className='flex flex-col items-center'>
              <img
                className='mb-6 h-24 w-auto max-w-full object-contain md:h-28'
                src='/UgatanLogoIcon.svg'
                width={4763}
                height={4880}
                alt=''
              />
              <h1 className='m-0 font-display text-[28px] font-extrabold leading-[1.4] tracking-[-1px] md:text-[40px]'>
                {labels.introTitle}
              </h1>
              <p className='mb-0 mt-4 max-w-[420px] text-base leading-7 text-mist md:text-lg'>
                {labels.introDescription}
              </p>
            </div>
            {props.suggestions}
          </section>
        )}
      </main>

      <footer className='chat-footer'>
        <div className='chat-content'>
          {props.tray && <div className='mb-3 rounded-2xl border border-line bg-white p-3'>{props.tray}</div>}
          <form className='chat-composer' onSubmit={submit}>
            {props.photo && (
              <div className='relative mx-2 mb-2 inline-block'>
                <img
                  src={photoSrc(props.photo)}
                  alt={labels.photoPreview}
                  className='block h-20 w-auto max-w-48 rounded-xl border border-line object-cover'
                />
                <button
                  type='button'
                  onClick={props.onRemovePhoto}
                  aria-label={labels.removePhoto}
                  title={labels.removePhoto}
                  className='absolute -right-2 -top-2 inline-flex size-6 items-center justify-center rounded-full bg-ink text-white'
                >
                  <svg className='size-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' aria-hidden='true'>
                    <path d='M6 6l12 12M18 6L6 18' />
                  </svg>
                </button>
              </div>
            )}
            <label className='sr-only' htmlFor='ugatan-question'>{labels.describe}</label>
            <textarea
              ref={textarea}
              id='ugatan-question'
              className='chat-textarea'
              rows={2}
              value={props.text}
              placeholder={labels.composerPlaceholder}
              onChange={(event) => props.onTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  window.matchMedia('(min-width: 768px) and (pointer: fine)').matches
                ) {
                  event.preventDefault();
                  if (canSend) props.onSubmit();
                }
              }}
            />
            <div className='flex min-h-12 items-center gap-1.5 pt-2'>
              <input
                ref={photoInput}
                type='file'
                accept='image/*'
                hidden
                onChange={(event) => {
                  props.onPhotoFile(event.target.files?.[0]);
                  // The same file can be chosen again after it is removed.
                  event.target.value = '';
                }}
              />
              <button
                type='button'
                className={`chat-icon-button ${props.photo ? 'bg-leaf-soft' : ''}`}
                aria-label={labels.photoButton}
                title={labels.photoButton}
                onClick={() => photoInput.current?.click()}
              >
                <img className='size-6' src='/home/photo-composer.svg' alt='' />
              </button>
              {props.onSymptoms && (
                <button
                  type='button'
                  className={`chat-icon-button ${props.symptomsOpen ? 'bg-leaf-soft' : ''}`}
                  aria-label={labels.symptomsHeading}
                  aria-expanded={props.symptomsOpen ?? false}
                  title={labels.symptomsHeading}
                  onClick={props.onSymptoms}
                >
                  <svg className='size-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
                    <path d='M12 5v14M5 12h14' />
                  </svg>
                </button>
              )}
              <VoiceInput
                labels={labels}
                language={DEFAULT_UI_LANGUAGE}
                hubUrl={props.hubUrl}
                onTranscript={appendTranscript}
                onNotice={props.onNotice}
              />
              <button
                type='submit'
                className='ml-auto grid size-12 shrink-0 place-items-center rounded-full bg-leaf disabled:cursor-default disabled:opacity-40'
                aria-label={labels.sendLabel}
                title={labels.sendLabel}
                disabled={!canSend}
              >
                <img className='size-6' src='/home/send.svg' alt='' />
              </button>
            </div>
          </form>
          <p className='chat-notice' role='status'>{props.notice}</p>
          <p className='m-0 mt-1 px-2 text-center text-xs leading-4 text-mist'>{labels.footer}</p>
        </div>
      </footer>
    </div>
  );
}
