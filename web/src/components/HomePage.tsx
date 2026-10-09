import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { DEFAULT_UI_LANGUAGE, type Labels } from '../config/labels';
import { VoiceInput } from './VoiceInput';

export interface HomePageProps {
  labels: Labels;
  text: string;
  notice: string;
  children?: ReactNode;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onHistory: () => void;
  onHelp: () => void;
  onNewConversation: () => void;
  onPhoto: () => void;
  onNotice: (notice: string) => void;
}

export function HomePage(props: HomePageProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const { labels } = props;

  useEffect(() => {
    const input = textarea.current;
    if (!input) return;
    input.style.height = '0px';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [props.text]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (props.text.trim()) props.onSubmit();
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
          aria-haspopup='dialog'
          aria-controls='ugatan-history-dialog'
          onClick={props.onHistory}
        >
          <img className='size-6' src='/home/history.svg' alt='' />
        </button>
        <img
          className='h-16 w-auto max-w-[120px] object-contain sm:max-w-[160px] md:absolute md:left-1/2 md:-translate-x-1/2'
          src='/UgatanLogo.png'
          width={3504}
          height={1827}
          alt={labels.appName}
        />
        <div className='flex items-center gap-1 md:ml-auto'>
          <button
            type='button'
            className='chat-icon-button bg-leaf-soft'
            aria-label={labels.newConversationLabel}
            title={labels.newConversationLabel}
            aria-haspopup='dialog'
            aria-controls='ugatan-history-dialog'
            onClick={props.onNewConversation}
          >
            <img className='size-6' src='/home/new-chat.svg' alt='' />
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

      <main className='chat-main'>
        {props.children ? (
          <div className='chat-content py-6 md:py-10'>{props.children}</div>
        ) : (
          <section className='chat-content flex flex-1 flex-col items-center justify-center py-10 text-center'>
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
          </section>
        )}
      </main>

      <footer className='chat-footer'>
        <div className='chat-content'>
          <form className='chat-composer' onSubmit={submit}>
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
                  if (props.text.trim()) props.onSubmit();
                }
              }}
            />
            <div className='flex min-h-12 items-center gap-1.5 pt-2'>
              <button
                type='button'
                className='chat-icon-button'
                aria-label={labels.photoButton}
                title={labels.photoButton}
                onClick={props.onPhoto}
              >
                <img className='size-6' src='/home/photo-composer.svg' alt='' />
              </button>
              <VoiceInput
                labels={labels}
                language={DEFAULT_UI_LANGUAGE}
                onTranscript={appendTranscript}
                onNotice={props.onNotice}
              />
              <button
                type='submit'
                className='ml-auto grid size-12 shrink-0 place-items-center rounded-full bg-leaf disabled:cursor-default disabled:opacity-40'
                aria-label={labels.sendLabel}
                title={labels.sendLabel}
                disabled={!props.text.trim()}
              >
                <img className='size-6' src='/home/send.svg' alt='' />
              </button>
            </div>
          </form>
          <p className='chat-notice' role='status'>{props.notice}</p>
        </div>
      </footer>
    </div>
  );
}
