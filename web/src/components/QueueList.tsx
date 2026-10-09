import type { Labels } from '../config/labels';
import type { QueuedQuestion } from '../lib/db';

interface QueueListProps {
  items: QueuedQuestion[];
  labels: Labels;
  locale: string;
  onSelect: (question: QueuedQuestion) => void;
}

export function QueueList({ items, labels, locale, onSelect }: QueueListProps) {
  if (items.length === 0) return <p className='my-3 text-sm text-mist'>{labels.nothingYet}</p>;
  return (
    <ul className='m-0 grid list-none gap-1 p-0'>
      {items.map((question) => (
        <li key={question.uid}>
          <button type='button' className='chat-history-item' onClick={() => onSelect(question)}>
            <span className='text-xs leading-5 text-mist'>
              <time dateTime={question.createdAt}>
                {new Date(question.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
              </time>
              {' · '}
              {question.status === 'answered' ? labels.answered : labels.queued}
            </span>
            <span className='font-semibold leading-6'>{question.text}</span>
            <span className='text-xs leading-5 text-mist'>{labels.historySaved}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
