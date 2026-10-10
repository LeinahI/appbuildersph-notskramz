import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { A } from './copy';
import { AdminDialog, AdminIcon } from './AdminDialog';
import { notify } from '../components/ToastHost';
import {
  createInvite,
  getUser,
  regenerateInvite,
  revokeInvite,
  revokeUser,
  WsApiError,
  type InviteDTO,
  type UserDTO,
} from '../lib/ws-api';

export function statusLabel(status: string): string {
  if (status === 'active') return A.active;
  if (status === 'revoked') return A.revoked;
  return A.pending;
}

export function StatusPill({ status }: { status: string }) {
  return <span className={'admin-status admin-status-' + status}>{statusLabel(status)}</span>;
}

export function errorText(err: unknown, fallback: string): string {
  if (err instanceof WsApiError) {
    if (err.status === 409) return A.duplicate;
    if (err.status === 0 || err.status >= 500) return fallback;
    return err.message.charAt(0).toUpperCase() + err.message.slice(1) + '.';
  }
  return A.disconnected;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function addressLine(user: UserDTO): string {
  const a = user.address;
  if (!a) return '—';
  return [a.line1, a.line2, a.barangay, a.city, a.province].filter((part) => part?.trim()).join(', ') || '—';
}

export function UserDetails({ user }: { user: UserDTO }) {
  return (
    <dl className='admin-details'>
      <div><dt>{A.fullName}</dt><dd>{user.fullName}</dd></div>
      <div><dt>{A.userId}</dt><dd className='font-mono text-xs'>{user.id}</dd></div>
      <div><dt>{A.status}</dt><dd><StatusPill status={user.status} /></dd></div>
      {user.birthDate ? <div><dt>{A.birthDate}</dt><dd>{user.birthDate}</dd></div> : null}
      <div><dt>{A.address}</dt><dd>{addressLine(user)}</dd></div>
      {user.phone ? <div><dt>{A.phone}</dt><dd>{user.phone}</dd></div> : null}
      <div><dt>{A.consentRecorded}</dt><dd>{user.consentAt ? `${A.consentYes} · ${formatDate(user.consentAt)}` : '—'}</dd></div>
      <div><dt>{A.registeredOn}</dt><dd>{formatDate(user.createdAt)}</dd></div>
    </dl>
  );
}

/** The user's single-use QR invitation: a real ws token, never a sample. */
export function QrInvitation({ user, onChanged }: { user: UserDTO; onChanged?: () => void }) {
  const [invite, setInvite] = useState<InviteDTO | null>(user.invite ?? null);
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = user.status === 'pending';

  useEffect(() => {
    if (!invite?.claimUrl) {
      setImage('');
      return;
    }
    let live = true;
    QRCode.toDataURL(invite.claimUrl, { width: 280, margin: 2 })
      .then((url) => { if (live) setImage(url); })
      .catch(() => { if (live) setImage(''); });
    return () => { live = false; };
  }, [invite?.claimUrl]);

  async function run(action: () => Promise<InviteDTO | null>) {
    setBusy(true);
    setError('');
    try {
      setInvite(await action());
      onChanged?.();
    } catch (err) {
      setError(errorText(err, A.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return <>
    {invite && image ? (
      <figure className='admin-qr'>
        <img src={image} width={280} height={280} alt={`${A.qrAlt} ${user.fullName}`} />
        <figcaption>{A.qrExpires} {formatDate(invite.expiresAt)}</figcaption>
      </figure>
    ) : (
      <div className='admin-qr-placeholder'>
        <AdminIcon name='qr' />
        <strong>{A.qrUnavailable}</strong>
      </div>
    )}
    <p className='admin-description'>{pending ? A.qrRequirement : A.qrNotPending}</p>
    <p className='admin-policy'>{A.qrPolicy}</p>
    {error ? <p className='admin-error' role='alert'>{error}</p> : null}
    <div className='admin-actions'>
      {!invite ? (
        <button type='button' className='btn' disabled={busy || !pending} onClick={() => run(() => createInvite(user.id))}>
          {A.generateQr}
        </button>
      ) : <>
        <button type='button' className='btn' disabled={busy || !pending} onClick={() => run(() => regenerateInvite(user.id))}>
          {A.regenerateQr}
        </button>
        {image ? (
          <a className='btn btn-secondary' href={image} download={`ugatan-invite-${user.id}.png`}>{A.downloadQr}</a>
        ) : null}
        <button type='button' className='btn btn-secondary' disabled={busy}
          onClick={() => run(async () => { await revokeInvite(invite.id); return null; })}>
          {A.qrRevoke}
        </button>
      </>}
    </div>
  </>;
}

/** Right-hand drawer for one saved user: details, QR invitation, and revoking access. */
export function UserDrawer({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    getUser(userId)
      .then((value) => { if (live) { setUser(value); setError(''); } })
      .catch((err) => { if (live) setError(errorText(err, A.unavailableList)); });
    return () => { live = false; };
  }, [userId, version]);

  async function revoke() {
    if (!user) return;
    setBusy(true);
    try {
      await revokeUser(user.id);
      notify({ title: A.revoked, description: user.fullName, type: 'success', language: 'en' });
      setConfirming(false);
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      setError(errorText(err, A.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDialog id='admin-user' title={confirming ? A.revokeTitle : user?.fullName ?? A.userDetails} drawer='right'
      onClose={confirming ? () => setConfirming(false) : onClose}>
      {confirming ? <>
        <p className='admin-description'>{A.revokeDescription}</p>
        <div className='admin-actions'>
          <button type='button' className='btn btn-secondary' onClick={() => setConfirming(false)} disabled={busy}>{A.cancel}</button>
          <button type='button' className='btn admin-danger' onClick={revoke} disabled={busy}>{A.revokeConfirm}</button>
        </div>
      </> : !user ? (
        error ? <p className='admin-error' role='alert'>{error}</p> : <p className='admin-description'>{A.loading}</p>
      ) : <>
        <UserDetails user={user} />
        <h3 className='admin-subheading'>{A.openQr}</h3>
        <QrInvitation key={user.status + (user.invite?.id ?? '')} user={user} onChanged={onChanged} />
        {error ? <p className='admin-error' role='alert'>{error}</p> : null}
        {user.status !== 'revoked' ? (
          <div className='admin-dialog-actions'>
            <button type='button' className='btn btn-secondary admin-danger-text' onClick={() => setConfirming(true)}>{A.revokeAccess}</button>
          </div>
        ) : null}
      </>}
    </AdminDialog>
  );
}
