import type { Labels } from '../config/labels';
import type { QueuedQuestion } from '../lib/db';

interface QueueListProps {
  items: QueuedQuestion[];
  labels: Labels;
  locale: string;
}

export function QueueList({ items, labels, locale }: QueueListProps) {
  if (items.length === 0) return <p className='text-[0.85rem] text-muted'>{labels.nothingYet}</p>;
  return (
    <ul className='m-0 grid list-none gap-2.5 p-0'>
      {items.map((question) => (
        <li key={question.uid} className='border-b border-rule pb-2'>
          <div className='text-[0.85rem] text-muted'>
            {new Date(question.createdAt).toLocaleString(locale)} ·{' '}
            {question.status === 'answered' ? labels.answered : labels.queued}
          </div>
          <div>{question.text}</div>
        </li>
      ))}
    </ul>
  );
}
