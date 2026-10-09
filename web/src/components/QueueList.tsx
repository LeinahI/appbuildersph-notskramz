import type { QueuedQuestion } from '../lib/db';
import { L } from '../config/labels';

export function QueueList({ items }: { items: QueuedQuestion[] }) {
  if (items.length === 0) return <p className="text-[0.85rem] text-muted">{L.nothingYet}</p>;
  return (
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {items.map((q) => (
        <li key={q.uid} className="border-b border-rule pb-2">
          <div className="text-[0.85rem] text-muted">
            {new Date(q.createdAt).toLocaleString('tl-PH')} · {q.status === 'answered' ? L.answered : L.queued}
          </div>
          <div>{q.text}</div>
        </li>
      ))}
    </ul>
  );
}
