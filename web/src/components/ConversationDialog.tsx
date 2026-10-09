import { forwardRef } from 'react';
import type { Labels } from '../config/labels';
import type { QueuedQuestion } from '../lib/db';
import { QueueList } from './QueueList';

interface ConversationDialogProps {
  items: QueuedQuestion[];
  labels: Labels;
  locale: string;
  onNewConversation: () => void;
  onSelect: (question: QueuedQuestion) => void;
}

export const ConversationDialog = forwardRef<HTMLDialogElement, ConversationDialogProps>(
  function ConversationDialog({ items, labels, locale, onNewConversation, onSelect }, ref) {
    return (
      <dialog id='ugatan-history-dialog' ref={ref} className='chat-dialog' aria-labelledby='ugatan-history-heading'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <h2 id='ugatan-history-heading' className='m-0 text-xl font-bold'>{labels.historyLabel}</h2>
          <form method='dialog'>
            <button type='submit' className='chat-icon-button' aria-label={labels.closeHistory} title={labels.closeHistory}>
              <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
                <path d='m6 6 12 12M6 18 18 6' />
              </svg>
            </button>
          </form>
        </div>
        <button type='button' className='btn flex min-h-12 w-full items-center justify-center gap-2' onClick={onNewConversation}>
          <img className='size-5 brightness-0 invert' src='/home/new-chat.svg' alt='' />
          {labels.newConversationLabel}
        </button>
        <div className='chat-history-list mt-4'>
          <QueueList items={items} labels={labels} locale={locale} onSelect={onSelect} />
        </div>
        <p className='mb-0 mt-4 border-t border-rule pt-4 text-sm leading-6 text-mist'>
          Naka-save lamang sa device na ito ang mga tanong at litrato. Ipinapadala lang ang mga ito sa hub sa Wi-Fi nito.
        </p>
      </dialog>
    );
  },
);
