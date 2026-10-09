import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loadClaimLink, loadDeviceId, saveClaimLink } from '../config/ws';
import { claimInvite, WsApiError } from '../lib/ws-api';

export default function ClaimPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const existing = loadClaimLink();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing invite token in the link.');
      return;
    }
    let cancelled = false;
    setStatus('working');
    claimInvite(token, loadDeviceId())
      .then((res) => {
        if (cancelled) return;
        saveClaimLink({ userId: res.userId, token: res.token });
        setStatus('ok');
        setMessage('Device linked. Opening chat…');
        navigate('/chat', { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof WsApiError ? err.message : 'Claim failed';
        // Used invite: if this browser already linked, open chat instead of a dead end.
        if (existing?.token && /consumed|expired|revoked|already claimed/i.test(msg)) {
          navigate('/chat', { replace: true });
          return;
        }
        setStatus('error');
        setMessage(
          /already claimed/i.test(msg)
            ? 'This farmer was already linked. Ask admin to Regenerate QR, then open the new link on this phone.'
            : /consumed|expired|revoked/i.test(msg)
              ? 'This QR was already used or expired. Ask admin to Regenerate the invite.'
              : msg,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-line bg-surface p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Ugatan claim</h1>
        {status === 'working' ? <p className="text-sm text-muted">Linking this device…</p> : null}
        {status === 'ok' ? <p className="text-sm text-ink">{message}</p> : null}
        {status === 'error' ? <p className="text-sm text-accent">{message}</p> : null}
        {existing && status !== 'working' ? (
          <p className="text-xs text-muted">Previous link on this device: user {existing.userId.slice(0, 8)}…</p>
        ) : null}
        <Link to={existing ? '/chat' : '/'} className="pill-btn inline-block no-underline">
          {existing ? 'Open chat' : 'Back to login'}
        </Link>
      </div>
    </div>
  );
}
