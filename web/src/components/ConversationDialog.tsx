import { forwardRef, useMemo, useState } from 'react';
import type { Labels } from '../config/labels';
import type { QueuedQuestion } from '../lib/db';
import { filterHistory, groupHistory, type HistoryGroupKey } from '../lib/history-groups';
import { QueueList } from './QueueList';

interface ConversationDialogProps {
  items: QueuedQuestion[];
  labels: Labels;
  locale: string;
  onNewConversation: () => void;
  /** Starts a new conversation with this text already in the composer. */
  onQuickStart: (text: string) => void;
  onSelect: (question: QueuedQuestion) => void;
}

export const ConversationDialog = forwardRef<HTMLDialogElement, ConversationDialogProps>(
  function ConversationDialog({ items, labels, locale, onNewConversation, onQuickStart, onSelect }, ref) {
    const [query, setQuery] = useState('');
    const groups = useMemo(() => groupHistory(filterHistory(items, query)), [items, query]);
    const groupTitle: Record<HistoryGroupKey, string> = {
      today: labels.historyToday,
      yesterday: labels.historyYesterday,
      earlier: labels.historyEarlier,
    };

    return (
      <dialog
        id='ugatan-history-dialog'
        ref={ref}
        className='chat-sheet'
        aria-labelledby='ugatan-history-heading'
        onClose={() => setQuery('')}
        onClick={(event) => {
          // A tap on the dimmed area (the dialog box itself, outside its content) closes the sheet.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className='chat-sheet-grip' aria-hidden='true' />
        <div className='chat-sheet-head'>
          <h2 id='ugatan-history-heading' className='m-0 text-xl font-bold tracking-tight'>{labels.historyLabel}</h2>
          <form method='dialog'>
            <button type='submit' className='chat-icon-button bg-sprout' aria-label={labels.closeHistory} title={labels.closeHistory}>
              <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
                <path d='m6 6 12 12M6 18 18 6' />
              </svg>
            </button>
          </form>
        </div>

        <div className='chat-sheet-actions'>
          <button
            type='button'
            className='btn flex min-h-12 w-full items-center justify-center gap-2 !rounded-full shadow-sm hover:bg-accent-hover'
            onClick={onNewConversation}
          >
            <img className='size-5 brightness-0 invert' src='/home/new-chat.svg' alt='' />
            {labels.newConversationLabel}
          </button>
          {items.length > 0 ? (
            <label className='chat-sheet-search'>
              <svg className='size-4 shrink-0 text-mist' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' aria-hidden='true'>
                <circle cx='11' cy='11' r='6.5' />
                <path d='m16 16 4 4' />
              </svg>
              <span className='sr-only'>{labels.historySearchLabel}</span>
              <input
                type='search'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                autoComplete='off'
                enterKeyHint='search'
              />
            </label>
          ) : null}
        </div>

        <div className='chat-sheet-body'>
          {items.length === 0 ? (
            <div className='grid justify-items-center gap-4 px-2 py-6 text-center'>
              <div className='grid size-[72px] place-items-center rounded-full bg-leaf-soft text-leaf' aria-hidden='true'>
                <svg className='size-9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5Z' />
                  <path d='M12 14.5v-4m0 0c0-1.6 1-2.5 2.6-2.6-.1 1.6-1 2.6-2.6 2.6Zm0 0c0-1.2-.8-2-2-2 0 1.2.8 2 2 2Z' />
                </svg>
              </div>
              <div className='grid gap-1.5'>
                <p className='m-0 text-base font-bold'>{labels.historyEmptyTitle}</p>
                <p className='m-0 text-sm leading-6 text-mist'>{labels.historyEmptyBody}</p>
              </div>
              <div className='grid w-full gap-2'>
                <p className='m-0 text-xs font-semibold uppercase tracking-wide text-mist'>{labels.historyQuickStartHeading}</p>
                <ul className='m-0 flex list-none flex-wrap justify-center gap-2 p-0'>
                  {labels.historyQuickStarts.map((prompt) => (
                    <li key={prompt}>
                      <button type='button' className='chat-chip' onClick={() => onQuickStart(prompt)}>{prompt}</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : groups.length === 0 ? (
            <p className='m-0 px-2 py-8 text-center text-sm text-mist'>{labels.searchNoResults}</p>
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-labelledby={`ugatan-history-${group.key}`} className='mb-3 last:mb-0'>
                <h3 id={`ugatan-history-${group.key}`} className='chat-sheet-group'>{groupTitle[group.key]}</h3>
                <QueueList items={group.items} labels={labels} locale={locale} showDate={group.key === 'earlier'} onSelect={onSelect} />
              </section>
            ))
          )}
        </div>

        <p className='chat-sheet-foot'>
          <svg className='mt-px size-3.5 shrink-0 text-leaf' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
            <path d='M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z' />
            <path d='m9 12 2 2 4-4' />
          </svg>
          <span>{labels.historyPrivacy}</span>
        </p>
      </dialog>
    );
  },
);
