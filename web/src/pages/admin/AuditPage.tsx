import { useEffect, useState } from 'react';
import { AuditDTO, listAudit, WsApiError } from '../../lib/ws-api';

export default function AuditPage() {
  const [items, setItems] = useState<AuditDTO[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listAudit()
      .then(setItems)
      .catch((err) => setError(err instanceof WsApiError ? err.message : 'Failed to load audit'));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted">Recent admin and claim events (no raw ID payloads).</p>
      </div>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted">No events yet.</li>
        ) : null}
        {items.map((e) => (
          <li key={e.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{e.eventType}</span>
              <time className="text-xs text-muted">{new Date(e.createdAt).toLocaleString()}</time>
            </div>
            <p className="mt-1 text-muted">
              actor {e.actorId || '—'} · subject {e.subjectId || '—'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
