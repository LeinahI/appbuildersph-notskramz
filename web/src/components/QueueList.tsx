import type { Labels } from '../config/labels';
import type { QueuedQuestion } from '../lib/db';
import { photoSrc } from '../lib/photo';

interface QueueListProps {
  items: QueuedQuestion[];
  labels: Labels;
  locale: string;
  /** Show the date next to the time, for groups that span many days. */
  showDate?: boolean;
  onSelect: (question: QueuedQuestion) => void;
}

export function QueueList({ items, labels, locale, showDate = false, onSelect }: QueueListProps) {
  if (items.length === 0) {
    return (
      <p className='m-0 rounded-2xl border border-dashed border-sprout-line bg-sprout px-4 py-6 text-center text-sm text-mist'>
        {labels.nothingYet}
      </p>
    );
  }
  return (
    <ul className='m-0 grid list-none gap-2 p-0'>
      {items.map((question) => {
        const created = new Date(question.createdAt);
        return (
          <li key={question.uid}>
            <button type='button' className='chat-history-item' onClick={() => onSelect(question)}>
              <span className='chat-history-thumb' aria-hidden='true'>
                {question.image ? (
                  <img src={photoSrc(question.image)} alt='' className='size-full object-cover' />
                ) : (
                  <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5Z' />
                  </svg>
                )}
              </span>
              <span className='grid min-w-0 gap-1'>
                <span className='chat-history-text'>{question.text}</span>
                <span className='chat-history-meta'>
                  <time dateTime={question.createdAt}>
                    {showDate ? `${created.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ` : ''}
                    {created.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
                  </time>
                  <span className={question.status === 'answered' ? 'chat-status chat-status-answered' : 'chat-status'}>
                    {question.status === 'answered' ? labels.answered : labels.queued}
                  </span>
                  {question.image ? <span className='sr-only'>{labels.historyPhoto}</span> : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
