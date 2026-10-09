import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { loadAdminToken, loadClaimLink, saveAdminToken } from '../config/ws';
import { chatHref } from '../lib/conversations';
import { login, WsApiError } from '../lib/ws-api';

type Tab = 'farmer' | 'admin';

export default function LoginPage() {
  const navigate = useNavigate();
  const claim = loadClaimLink();
  const [tab, setTab] = useState<Tab>(claim ? 'farmer' : 'admin');
  const [email, setEmail] = useState('admin@ugatan.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loadAdminToken()) {
    return <Navigate to="/admin" replace />;
  }

  async function onAdminSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      saveAdminToken(res.token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof WsApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-line bg-surface p-6 shadow-sm">
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight">Ugatan</h1>
          <p className="mt-1 text-sm text-muted">Mag-sign in bilang magsasaka o admin.</p>
        </div>

        <div className="flex gap-1 rounded-lg bg-soft p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${tab === 'farmer' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            onClick={() => {
              setTab('farmer');
              setError('');
            }}
          >
            Magsasaka
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${tab === 'admin' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            onClick={() => {
              setTab('admin');
              setError('');
            }}
          >
            Admin
          </button>
        </div>

        {tab === 'farmer' ? (
          <div className="space-y-3 text-sm">
            {claim ? (
              <>
                <p className="text-muted">
                  Linked device (user {claim.userId.slice(0, 8)}…). Buksan ang chat with history sidebar.
                </p>
                <button
                  type="button"
                  className="pill-btn w-full bg-accent text-white hover:bg-accent-hover"
                  onClick={() => navigate(chatHref())}
                >
                  Magpatuloy sa chat
                </button>
              </>
            ) : (
              <>
                <p className="text-muted">
                  Kailangan mong i-claim ang QR mula sa admin bago magamit ang chat. Kapag na-scan mo ang QR, dadalhin ka
                  sa claim page.
                </p>
                <p className="text-muted">Kung may claim link ka, buksan ito sa phone na ito.</p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={onAdminSubmit} className="space-y-3">
            <label className="field-label">
              Email
              <input
                className="field-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="field-label">
              Password
              <input
                className="field-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <button
              type="submit"
              className="pill-btn w-full bg-accent text-white hover:bg-accent-hover"
              disabled={busy}
            >
              {busy ? 'Signing in…' : 'Sign in as admin'}
            </button>
          </form>
        )}

        {tab === 'farmer' && error ? <p className="text-sm text-accent">{error}</p> : null}
      </div>
    </div>
  );
}

/** Guard: farmer claim JWT required. */
export function RequireFarmer({ children }: { children: React.ReactNode }) {
  if (!loadClaimLink()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
