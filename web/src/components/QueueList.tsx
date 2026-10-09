import type { QueuedQuestion } from '../lib/db';
import { L } from '../config/labels';

export function QueueList({ items }: { items: QueuedQuestion[] }) {
  if (items.length === 0) return <p className="muted small">{L.nothingYet}</p>;
  return (
    <ul className="history">
      {items.map((q) => (
        <li key={q.uid}>
          <div className="small muted">
            {new Date(q.createdAt).toLocaleString('tl-PH')} · {q.status === 'answered' ? L.answered : L.queued}
          </div>
          <div>{q.text}</div>
        </li>
      ))}
    </ul>
  );
}
