import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { loadOrCreateDeviceId, saveFarmerSession } from '../config/farmerSession';
import { claimInvite, WsApiError, type ClaimResult } from '../lib/ws-api';

type ClaimState =
  | { kind: 'loading' }
  | { kind: 'ok' }
  | { kind: 'error'; message: string };

/** Dedupe StrictMode double-mount so a single-use invite is only claimed once. */
const inFlight = new Map<string, Promise<ClaimResult>>();

function claimOnce(token: string, deviceId: string): Promise<ClaimResult> {
  const existing = inFlight.get(token);
  if (existing) return existing;
  const p = claimInvite({ token, deviceId }).finally(() => {
    inFlight.delete(token);
  });
  inFlight.set(token, p);
  return p;
}

/** QR claim landing: POST invite token, save farmer session, go to /chat. */
export default function ClaimPage() {
  const [params] = useSearchParams();
  const token = (params.get('token') ?? '').trim();
  const [state, setState] = useState<ClaimState>(() =>
    token ? { kind: 'loading' } : { kind: 'error', message: 'Walang claim token. Missing invite link.' },
  );

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void (async () => {
      try {
        const res = await claimOnce(token, loadOrCreateDeviceId());
        // Always persist — StrictMode may cancel the first mount; the shared
        // in-flight claim must not leave a JWT without a saved session.
        saveFarmerSession({
          token: res.token,
          userId: res.userId,
          fullName: (res.fullName ?? '').trim(),
        });
        if (alive) setState({ kind: 'ok' });
      } catch (e) {
        if (!alive) return;
        const msg =
          e instanceof WsApiError
            ? e.message
            : 'Hindi ma-claim ang invite. Try again or ask your co-op for a new QR.';
        setState({ kind: 'error', message: msg });
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  if (state.kind === 'ok') {
    return <Navigate to="/chat" replace />;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-ink">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="font-serif text-2xl font-medium tracking-tight">Ugatan</h1>
        {state.kind === 'loading' ? (
          <p className="text-sm text-muted">Kinaklaim ang invite… Claiming invite…</p>
        ) : (
          <>
            <p className="text-sm text-accent" role="alert">
              {state.message}
            </p>
            <Link to="/chat" className="inline-block text-sm font-medium underline underline-offset-2">
              Magpatuloy sa chat →
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
