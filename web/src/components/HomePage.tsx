import { useEffect, useRef, type FormEvent, type ReactNode, type Ref } from 'react';
import { DEFAULT_UI_LANGUAGE, type Labels } from '../config/labels';
import { photoSrc } from '../lib/photo';
import { VoiceInput } from './VoiceInput';
import { DisplayPreferencesIcon } from './DisplayPreferencesIcon';
import { DisplayPreferencesPanel } from './DisplayPreferencesPanel';
import { NetworkBadge } from './NetworkBadge';

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
  /** Bumped to open the camera or gallery choice, for example from a follow-up chip. */
  photoRequest?: number;
  /** The conversation sidebar is showing, so it already offers history and a new chat. */
  sidebarOpen?: boolean;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onHistory: () => void;
  sidebarDesktop?: boolean;
  onHelp: () => void;
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
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoMenu = useRef<HTMLDetailsElement>(null);
  const displayDialog = useRef<HTMLDialogElement>(null);

  /** Closes the photo menu and opens the camera or the gallery. */
  function pickPhoto(input: HTMLInputElement | null) {
    if (photoMenu.current) photoMenu.current.open = false;
    input?.click();
  }

  function onPhotoInput(event: React.ChangeEvent<HTMLInputElement>) {
    props.onPhotoFile(event.target.files?.[0]);
    // The same file can be chosen again after it is removed.
    event.target.value = '';
  }
  const { labels } = props;
  const canSend = props.text.trim() !== '' || props.photo !== null;
  const hasChat = Boolean(props.children);
  const actionLabel = 'max-[339px]:sr-only';

  useEffect(() => {
    if (!props.photoRequest || !photoMenu.current) return;
    photoMenu.current.open = true;
    photoMenu.current.querySelector('button')?.focus();
  }, [props.photoRequest]);

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
        {/* Keep the toggle available on mobile and when the desktop panel is collapsed. */}
        <div className={`flex shrink-0 items-center gap-1 ${props.sidebarDesktop && props.sidebarOpen ? 'lg:hidden' : ''}`}>
          <button
            type='button'
            className='chat-icon-button'
            aria-label={labels.historyLabel}
            title={props.sidebarOpen ? labels.sidebarCloseLabel : labels.sidebarOpenLabel}
            aria-haspopup={props.sidebarDesktop ? undefined : 'dialog'}
            aria-expanded={props.sidebarOpen ?? false}
            aria-controls='ugatan-conversation-sidebar'
            onClick={props.onHistory}
          >
            <img className='size-6' src='/home/history.svg' alt='' />
          </button>
        </div>
        <img
          className='h-[64px] w-auto min-w-0 max-w-[96px] object-contain min-[400px]:max-w-[120px] sm:max-w-[160px] md:absolute md:left-1/2 md:-translate-x-1/2'
          src='/UgatanLogo.png'
          width={3504}
          height={1827}
          alt={labels.appName}
        />
        <div className='flex shrink-0 items-center gap-1 md:ml-auto'>
          {/* A new chat is pointless on the welcome screen, and the open sidebar already has the button. */}
          <button
            type='button'
            className={`chat-icon-button bg-leaf-soft ${hasChat ? '' : 'hidden'} ${props.sidebarDesktop && props.sidebarOpen ? 'lg:hidden' : ''}`}
            aria-label={labels.newConversationLabel}
            title={labels.newConversationLabel}
            onClick={props.onNewConversation}
          >
            <img className='size-6' src='/home/new-chat.svg' alt='' />
          </button>
          <NetworkBadge labels={labels} />
          <button
            type='button'
            className='chat-icon-button'
            aria-label={labels.displayLabel}
            title={labels.displayLabel}
            aria-haspopup='dialog'
            aria-controls='ugatan-display-dialog'
            onClick={() => displayDialog.current?.showModal()}
          >
            <DisplayPreferencesIcon />
          </button>
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
          <section className='chat-content chat-content-wide flex flex-1 flex-col items-center gap-6 py-6 text-center md:gap-8 md:py-10'>
            <div className='flex flex-col items-center'>
              <img
                className='mb-4 hidden h-[72px] w-auto max-w-full object-contain md:mb-6 md:block md:h-[96px] [@media(max-height:820px)]:hidden'
                src='/UgatanLogoIcon.svg'
                width={4763}
                height={4880}
                alt=''
              />
              <h1 className='m-0 font-display text-[1.5rem] font-extrabold leading-[1.4] tracking-[-0.035em] md:text-[2.5rem]'>
                {labels.introTitle}
              </h1>
              <p className='mb-0 mt-2 max-w-[420px] text-[0.9375rem] leading-6 text-mist md:mt-4 md:text-lg md:leading-7'>
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
              {/* The Android app's web view offers only the gallery for a plain file input, so the camera is its own choice. */}
              <input ref={cameraInput} type='file' accept='image/*' capture='environment' hidden onChange={onPhotoInput} />
              <input ref={photoInput} type='file' accept='image/*' hidden onChange={onPhotoInput} />
              <details ref={photoMenu} className='relative'>
                <summary
                  className={`chat-action-button list-none [&::-webkit-details-marker]:hidden ${props.photo ? 'ring-2 ring-leaf' : ''}`}
                  aria-label={labels.photoButton}
                  title={labels.photoButton}
                >
                  <img className='size-6' src='/home/photo-composer.svg' alt='' />
                  <span className={actionLabel} aria-hidden='true'>{labels.photoButton}</span>
                </summary>
                <div className='absolute bottom-full left-0 z-20 mb-2 grid min-w-[12rem] gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-lg'>
                  <button type='button' className='min-h-12 rounded-xl px-3 text-left text-[0.9375rem] hover:bg-soft' onClick={() => pickPhoto(cameraInput.current)}>
                    {labels.photoTake}
                  </button>
                  <button type='button' className='min-h-12 rounded-xl px-3 text-left text-[0.9375rem] hover:bg-soft' onClick={() => pickPhoto(photoInput.current)}>
                    {labels.photoChoose}
                  </button>
                  {props.onSymptoms && (
                    <button
                      type='button'
                      className={`min-h-12 rounded-xl px-3 text-left text-[0.9375rem] hover:bg-soft ${props.symptomsOpen ? 'bg-leaf-soft' : ''}`}
                      aria-expanded={props.symptomsOpen ?? false}
                      onClick={() => {
                        if (photoMenu.current) photoMenu.current.open = false;
                        props.onSymptoms?.();
                      }}
                    >
                      {labels.symptomsHeading}
                    </button>
                  )}
                </div>
              </details>
              <VoiceInput
                labels={labels}
                language={DEFAULT_UI_LANGUAGE}
                hubUrl={props.hubUrl}
                labeled
                labelClass={actionLabel}
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
          {/* In a chat the pesticide advisory ends the answer itself, so the line is not repeated here. */}
          {!hasChat && <p className='m-0 mt-1 px-2 text-center text-xs leading-4 text-mist'>{labels.footer}</p>}
        </div>
      </footer>
      <dialog ref={displayDialog} id='ugatan-display-dialog' className='chat-dialog' aria-labelledby='ugatan-display-heading'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <h2 id='ugatan-display-heading' className='m-0 text-xl font-bold'>{labels.displayLabel}</h2>
          <form method='dialog'>
            <button type='submit' className='chat-icon-button' aria-label={labels.closeDisplay} title={labels.closeDisplay}>
              <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
                <path d='m6 6 12 12M6 18 18 6' />
              </svg>
            </button>
          </form>
        </div>
        <DisplayPreferencesPanel language='tl' id='farmer-display' />
      </dialog>
    </div>
  );
}
