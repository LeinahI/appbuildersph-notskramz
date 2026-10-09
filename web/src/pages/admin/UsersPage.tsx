import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listUsers, UserDTO, WsApiError } from '../../lib/ws-api';

export default function UsersPage() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listUsers(q || undefined, status || undefined)
      .then((items) => {
        if (!cancelled) setUsers(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof WsApiError ? err.message : 'Failed to load users');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Farmers</h1>
          <p className="text-sm text-muted">Pending until they claim a QR invite.</p>
        </div>
        <Link to="/admin/register" className="pill-btn bg-accent text-white no-underline hover:bg-accent-hover">
          Register farmer
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="field-label min-w-[12rem] flex-1">
          Search
          <input
            className="field-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or phone"
          />
        </label>
        <label className="field-label">
          Status
          <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </label>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Loading…</p> : null}

      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {users.length === 0 && !loading ? (
          <li className="px-4 py-8 text-center text-sm text-muted">No farmers yet.</li>
        ) : null}
        {users.map((u) => (
          <li key={u.id}>
            <Link
              to={`/admin/users/${u.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-ink no-underline hover:bg-soft"
            >
              <span>
                <span className="font-medium">{u.fullName}</span>
                <span className="mt-0.5 block text-sm text-muted">
                  {u.address?.barangay ? `${u.address.barangay}, ${u.address.city}` : u.phone || '—'}
                </span>
              </span>
              <span className="rounded-md bg-soft px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted">
                {u.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
