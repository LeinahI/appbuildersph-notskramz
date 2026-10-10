import { useEffect, useRef, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { A } from './copy';
import { notify } from '../components/ToastHost';
import { loadAdminToken } from '../config/ws';
import {
  createInvite,
  getUser,
  registerUser,
  revokeUser,
  WsApiError,
  type InviteDTO,
  type UserDTO,
} from '../lib/ws-api';
import { AdminDialog, AdminIcon } from './AdminDialog';
import {
  draftToRegisterBody,
  emptyDraft,
  fields,
  hasDraft,
  validateDraft,
  type Draft,
  type DraftErrors,
  type Method,
} from './registration';

function statusLabel(status: string | undefined): string {
  if (status === 'active') return A.active;
  if (status === 'revoked') return A.revoked;
  return A.pending;
}

function Details({ draft, status }: { draft: Draft; status?: string }) {
  return (
    <dl className='admin-details'>
      {fields.map(({ key, label }) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{draft[key].trim()}</dd>
        </div>
      ))}
      <div>
        <dt>{A.initialStatus}</dt>
        <dd>
          <span className='admin-status'>{statusLabel(status)}</span>
        </dd>
      </div>
    </dl>
  );
}

export function QrInvitation({
  userId = null,
  invite = null,
  qrDataUrl = '',
  busy = false,
  error = '',
  status = '',
  onGenerate = () => {},
}: {
  userId?: string | null;
  invite?: InviteDTO | null;
  qrDataUrl?: string;
  busy?: boolean;
  error?: string;
  status?: string;
  onGenerate?: () => void;
} = {}) {
  return (
    <>
      {qrDataUrl ? (
        <div className='admin-qr-placeholder'>
          <img src={qrDataUrl} alt='QR invitation' width={256} height={256} />
        </div>
      ) : (
        <div className='admin-qr-placeholder'>
          <AdminIcon name='qr' />
          <strong>{A.qrUnavailable}</strong>
        </div>
      )}
      <p className='admin-description'>{A.qrRequirement}</p>
      <p className='admin-policy'>{A.qrPolicy}</p>
      {status ? <p className='admin-status'>{statusLabel(status)}</p> : null}
      {invite?.claimUrl ? <p className='break-all font-mono text-xs'>{invite.claimUrl}</p> : null}
      {error ? (
        <p className='admin-callout' role='alert'>
          {error}
        </p>
      ) : null}
      <div className='admin-actions'>
        <button type='button' className='btn' disabled={!userId || busy || !!invite} onClick={onGenerate}>
          {A.generateQr}
        </button>
        {qrDataUrl ? (
          <a className='btn btn-secondary' href={qrDataUrl} download={`ugatan-invite-${userId ?? 'qr'}.png`}>
            {A.downloadQr}
          </a>
        ) : (
          <button type='button' className='btn btn-secondary' disabled>
            {A.downloadQr}
          </button>
        )}
      </div>
    </>
  );
}

function DraftRecord({
  draft,
  saved,
  busy,
  error,
  onQr,
  onRevoke,
}: {
  draft: Draft;
  saved: UserDTO | null;
  busy: boolean;
  error: string;
  onQr: () => void;
  onRevoke: () => void;
}) {
  return (
    <>
      <p className='admin-description'>
        {saved ? (
          <>
            {A.recordSavedNotice} <code>{saved.id}</code>
          </>
        ) : (
          A.recordPreviewNotice
        )}
      </p>
      <Details draft={draft} status={saved?.status} />
      <dl className='admin-details'>
        <div>
          <dt>{A.accountAccess}</dt>
          <dd>{saved?.deviceId ? saved.deviceId : A.notLinked}</dd>
        </div>
        <div>
          <dt>{A.consentRecorded}</dt>
          <dd>{A.consentYes}</dd>
        </div>
      </dl>
      {error ? (
        <p className='admin-callout' role='alert'>
          {error}
        </p>
      ) : null}
      <div className='admin-actions'>
        <button type='button' className='btn' disabled={!saved} onClick={onQr}>
          {A.openQrPreview}
        </button>
        <button type='button' className='btn btn-secondary' disabled={!saved || busy} onClick={onRevoke}>
          {A.revokeAccess}
        </button>
      </div>
    </>
  );
}

export type RegistrationDialogProps = {
  onClose: () => void;
  onSaved?: (user: UserDTO) => void;
  /** Open on an existing user (Users/QR list row). */
  existingUser?: UserDTO | null;
  initialStep?: 'method' | 'details' | 'review' | 'record' | 'qr';
};

export function RegistrationDialog({
  onClose,
  onSaved,
  existingUser = null,
  initialStep,
}: RegistrationDialogProps) {
  const [step, setStep] = useState<'method' | 'details' | 'review' | 'record' | 'qr'>(
    () => initialStep ?? (existingUser ? 'record' : 'method'),
  );
  const [method, setMethod] = useState<Method>('manual');
  const [draft, setDraft] = useState<Draft>(() => {
    if (!existingUser) return emptyDraft();
    return {
      fullName: existingUser.fullName ?? '',
      age: existingUser.age != null ? String(existingUser.age) : '',
      barangay: existingUser.address?.barangay ?? '',
      municipality: existingUser.address?.city ?? '',
      province: existingUser.address?.province ?? '',
      consent: true,
    };
  });
  const [errors, setErrors] = useState<DraftErrors>({});
  const [discarding, setDiscarding] = useState(false);
  const [saved, setSaved] = useState<UserDTO | null>(existingUser);
  const [invite, setInvite] = useState<InviteDTO | null>(existingUser?.invite ?? null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasDraft(draft) || saved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, saved]);

  useEffect(() => {
    if (!invite?.claimUrl) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(invite.claimUrl, { width: 256, margin: 2 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [invite?.claimUrl]);

  useEffect(() => {
    if (step !== 'qr' || !saved?.id || saved.status === 'active' || saved.status === 'revoked') return;
    let stop = false;
    const tick = () => {
      void getUser(saved.id)
        .then((next) => {
          if (stop || next.status === saved.status) return;
          setSaved(next);
          if (next.status === 'active') onSavedRef.current?.(next);
        })
        .catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [step, saved?.id, saved?.status]);

  function choose(next: Method) {
    setMethod(next);
    setDraft((value) => ({ ...value, consent: false }));
    setErrors({});
    setStep('details');
  }
  function requestClose() {
    if (discarding) setDiscarding(false);
    else if (hasDraft(draft) && !saved) setDiscarding(true);
    else onClose();
  }
  function review(event: FormEvent) {
    event.preventDefault();
    if (method === 'scan') return;
    const validation = validateDraft(draft);
    setErrors(validation);
    const first = Object.keys(validation)[0];
    if (first) {
      requestAnimationFrame(() => document.getElementById('registration-' + first)?.focus());
      return;
    }
    setStep('review');
  }

  async function confirmSave() {
    setError('');
    if (!loadAdminToken()) {
      setError(A.signInRequired);
      window.location.assign('/admin/login');
      return;
    }
    setBusy(true);
    try {
      const user = await registerUser(draftToRegisterBody(draft));
      setSaved(user);
      onSaved?.(user);
      notify({ title: A.saved, description: A.savedNotice, type: 'success', language: 'en' });
      setStep('record');
    } catch (err) {
      setError(err instanceof WsApiError ? err.message : A.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function issueInvite() {
    if (!saved) return;
    setError('');
    setBusy(true);
    try {
      const next = await createInvite(saved.id);
      setInvite(next);
      notify({ title: A.inviteCreated, description: A.qrPolicy, type: 'success', language: 'en' });
    } catch (err) {
      setError(err instanceof WsApiError ? err.message : A.inviteFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke() {
    if (!saved) return;
    setError('');
    setBusy(true);
    try {
      await revokeUser(saved.id);
      setSaved({ ...saved, status: 'revoked' });
      notify({ title: A.revokeAccess, description: saved.fullName, type: 'success', language: 'en' });
    } catch (err) {
      setError(err instanceof WsApiError ? err.message : A.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const title = discarding
    ? A.discardTitle
    : {
        method: A.methodTitle,
        details: A.detailsTitle,
        review: A.reviewTitle,
        record: A.recordPreviewTitle,
        qr: A.qrDialogTitle,
      }[step];

  return (
    <AdminDialog
      id='admin-registration'
      title={title}
      drawer='right'
      icon={!discarding && step === 'method' ? 'registration' : undefined}
      onClose={requestClose}
    >
      {discarding ? (
        <>
          <p className='admin-description'>{A.discardDescription}</p>
          <div className='admin-actions'>
            <button type='button' className='btn btn-secondary' onClick={() => setDiscarding(false)}>
              {A.keepDraft}
            </button>
            <button
              type='button'
              className='btn'
              onClick={() => {
                onClose();
                notify({ title: A.draftDiscarded, description: A.draftDiscardedNotice, type: 'success', language: 'en' });
              }}
            >
              {A.discard}
            </button>
          </div>
        </>
      ) : step === 'method' ? (
        <>
          <p className='admin-description'>{A.methodDescription}</p>
          <div className='admin-methods'>
            {(['manual', 'scan'] as const).map((value) => (
              <button type='button' key={value} onClick={() => choose(value)}>
                <AdminIcon name={value} />
                <span>
                  <strong>{A[value]}</strong>
                  <small>{value === 'manual' ? A.manualHint : A.scanHint}</small>
                </span>
                <AdminIcon name='arrow' />
              </button>
            ))}
          </div>
          <p className='admin-privacy'>
            <AdminIcon name='lock' />
            {A.draftOnly}
          </p>
        </>
      ) : step === 'details' ? (
        <>
          <p className='admin-eyebrow'>{method === 'manual' ? A.manualStep : A.scanStep}</p>
          <p className='admin-description'>{A.detailsDescription}</p>
          {method === 'scan' && (
            <section className='admin-callout'>
              <div className='flex items-center gap-3'>
                <AdminIcon name='scan' />
                <strong>{A.scan}</strong>
              </div>
              <p id='admin-scan-unavailable'>{A.scanUnavailable}</p>
              <div className='admin-actions'>
                <button type='button' className='btn btn-secondary' disabled aria-describedby='admin-scan-unavailable'>
                  {A.scanAction}
                </button>
                <button type='button' className='btn' onClick={() => choose('manual')}>
                  {A.scanFallback}
                </button>
              </div>
            </section>
          )}
          <form onSubmit={review} noValidate autoComplete='off'>
            <label className='admin-consent'>
              <input
                id='registration-consent'
                type='checkbox'
                checked={draft.consent}
                aria-invalid={!!errors.consent}
                aria-describedby={errors.consent ? 'registration-consent-error' : undefined}
                onChange={(event) => {
                  setDraft({ ...draft, consent: event.target.checked });
                  setErrors({ ...errors, consent: undefined });
                }}
              />
              <span>{method === 'scan' ? A.scanConsent : A.consent}</span>
            </label>
            {errors.consent && (
              <p id='registration-consent-error' className='admin-error' role='alert'>
                {errors.consent}
              </p>
            )}
            <fieldset className='admin-form-grid' disabled={method === 'scan'}>
              <legend className='sr-only'>{A.detailsTitle}</legend>
              {fields.map(({ key, label }) => (
                <div className={key === 'fullName' ? 'sm:col-span-2' : ''} key={key}>
                  <label className='admin-field' htmlFor={'registration-' + key}>
                    {label}
                    <input
                      id={'registration-' + key}
                      name={key}
                      type={key === 'age' ? 'number' : 'text'}
                      min={key === 'age' ? MIN_AGE_INPUT : undefined}
                      step={key === 'age' ? 1 : undefined}
                      required
                      maxLength={key === 'age' ? undefined : 150}
                      value={draft[key]}
                      aria-invalid={!!errors[key]}
                      aria-describedby={errors[key] ? 'registration-' + key + '-error' : undefined}
                      onChange={(event) => {
                        setDraft({ ...draft, [key]: event.target.value });
                        setErrors({ ...errors, [key]: undefined });
                      }}
                    />
                  </label>
                  {errors[key] && (
                    <p id={'registration-' + key + '-error'} className='admin-error' role='alert'>
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
            </fieldset>
            <p className='admin-privacy'>
              <AdminIcon name='privacy' />
              {A.privacy}
            </p>
            <div className='admin-dialog-actions'>
              <button type='button' className='btn btn-secondary' onClick={() => setStep('method')}>
                {A.back}
              </button>
              <button type='submit' className='btn' disabled={method === 'scan'}>
                {A.review}
              </button>
            </div>
          </form>
        </>
      ) : step === 'review' ? (
        <>
          <p className='admin-eyebrow'>{A.reviewStep}</p>
          <p className='admin-description'>{A.reviewDescription}</p>
          <Details draft={draft} />
          <p className='admin-callout'>{A.validationNotice}</p>
          {error ? (
            <p className='admin-callout' role='alert'>
              {error}
            </p>
          ) : null}
          <div className='admin-dialog-actions'>
            <button type='button' className='btn btn-secondary' onClick={() => setStep('details')} disabled={busy}>
              {A.edit}
            </button>
            <button type='button' className='btn' disabled={busy} onClick={() => void confirmSave()}>
              {busy ? 'Saving…' : A.confirm}
            </button>
          </div>
          <button type='button' className='admin-text-button mt-4' onClick={() => setStep('record')} disabled={busy}>
            {A.previewRecord}
          </button>
        </>
      ) : step === 'record' ? (
        <>
          <DraftRecord
            draft={draft}
            saved={saved}
            busy={busy}
            error={error}
            onQr={() => setStep('qr')}
            onRevoke={() => void onRevoke()}
          />
          <div className='admin-dialog-actions'>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() => setStep(saved ? 'method' : 'review')}
            >
              {A.back}
            </button>
          </div>
        </>
      ) : (
        <>
          <QrInvitation
            userId={saved?.id ?? null}
            invite={invite}
            qrDataUrl={qrDataUrl}
            busy={busy}
            error={error}
            status={saved?.status}
            onGenerate={() => void issueInvite()}
          />
          <div className='admin-dialog-actions'>
            <button type='button' className='btn btn-secondary' onClick={() => setStep('record')}>
              {A.back}
            </button>
          </div>
        </>
      )}
    </AdminDialog>
  );
}

const MIN_AGE_INPUT = 18;
