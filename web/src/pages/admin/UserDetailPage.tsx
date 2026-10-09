import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  createInvite,
  getUser,
  InviteDTO,
  regenerateInvite,
  revokeInvite,
  revokeUser,
  UserDTO,
  WsApiError,
} from '../../lib/ws-api';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [invite, setInvite] = useState<InviteDTO | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!id) return;
    const u = await getUser(id);
    setUser(u);
    setInvite(u.invite ?? null);
  }

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((err) => {
        if (!cancelled) setError(err instanceof WsApiError ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per id
  }, [id]);

  useEffect(() => {
    if (!invite?.claimUrl) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(invite.claimUrl, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [invite?.claimUrl]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof WsApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user && !error) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  if (!user) {
    return <p className="text-sm text-accent">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="text-sm text-muted no-underline hover:text-ink">
          ← Farmers
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{user.fullName}</h1>
        <p className="text-sm text-muted">
          Status: <span className="font-medium text-ink">{user.status}</span>
          {user.age ? ` · Age ${user.age}` : ''}
          {user.deviceId ? ` · Device linked` : ''}
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4 text-sm">
        <h2 className="mb-2 font-medium">Address</h2>
        <p>
          {user.address?.line1}
          {user.address?.line2 ? `, ${user.address.line2}` : ''}
          <br />
          {user.address?.barangay}, {user.address?.city}, {user.address?.province} {user.address?.postalCode}
        </p>
        {user.phone ? <p className="mt-2 text-muted">Phone: {user.phone}</p> : null}
        {user.consentAt ? <p className="mt-1 text-muted">Consent: {user.consentAt}</p> : null}
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-medium">QR claim invite</h2>
        <p className="text-sm text-muted">Single-use. Default expiry 24 hours. Farmer opens the link on their phone.</p>
        {invite ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {qrDataUrl ? <img src={qrDataUrl} alt="Claim QR code" className="rounded-lg border border-line bg-white p-2" /> : null}
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <p className="break-all font-mono text-xs">{invite.claimUrl}</p>
              <p className="text-muted">Expires {new Date(invite.expiresAt).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No active invite.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {!invite ? (
            <button
              type="button"
              className="pill-btn bg-accent text-white hover:bg-accent-hover"
              disabled={busy || user.status === 'revoked'}
              onClick={() => run(async () => setInvite(await createInvite(user.id)))}
            >
              Generate QR
            </button>
          ) : (
            <>
              <button
                type="button"
                className="pill-btn"
                disabled={busy}
                onClick={() => run(async () => setInvite(await regenerateInvite(user.id)))}
              >
                Regenerate
              </button>
              <button
                type="button"
                className="pill-btn"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await revokeInvite(invite.id);
                    setInvite(null);
                  })
                }
              >
                Revoke invite
              </button>
            </>
          )}
          {user.status !== 'revoked' ? (
            <button
              type="button"
              className="pill-btn text-accent"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Revoke access for ${user.fullName}?`)) {
                  run(async () => {
                    await revokeUser(user.id);
                  });
                }
              }}
            >
              Revoke user
            </button>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  );
}
