import { useEffect, useState, type FormEvent } from 'react';
import { A } from './copy';
import { notify } from '../components/ToastHost';
import { AdminDialog, AdminIcon } from './AdminDialog';
import { emptyDraft, fields, hasDraft, isoDate, optional, toRegisterBody, validateDraft, type Draft, type DraftErrors, type Method } from './registration';
import { registerUser, type UserDTO } from '../lib/ws-api';
import { QrInvitation, UserDetails, errorText } from './UserPanel';

function Details({ draft }: { draft: Draft }) {
  return <dl className='admin-details'>
    {fields.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{draft[key].trim() || '—'}</dd></div>)}
    <div><dt>{A.initialStatus}</dt><dd><span className='admin-status'>{A.pending}</span></dd></div>
  </dl>;
}

export function RegistrationDialog({ onClose, onSaved }: { onClose: () => void; onSaved?: (user: UserDTO) => void }) {
  const [step, setStep] = useState<'method' | 'details' | 'review' | 'record' | 'qr'>('method');
  const [method, setMethod] = useState<Method>('manual');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [discarding, setDiscarding] = useState(false);
  const [saved, setSaved] = useState<UserDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  // Once saved, there is no draft left to lose.
  const unsaved = !saved && hasDraft(draft);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  function choose(next: Method) {
    setMethod(next);
    setDraft((value) => ({ ...value, consent: false }));
    setErrors({});
    setStep('details');
  }
  function requestClose() {
    if (discarding) setDiscarding(false);
    else if (unsaved) setDiscarding(true);
    else onClose();
  }
  async function save() {
    setSaving(true);
    setSaveError('');
    try {
      const user = await registerUser(toRegisterBody(draft));
      setSaved(user);
      setStep('record');
      onSaved?.(user);
      notify({ title: A.savedTitle, description: user.fullName, type: 'success', language: 'en' });
    } catch (err) {
      setSaveError(errorText(err, A.saveFailed));
    } finally {
      setSaving(false);
    }
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
  const title = discarding ? A.discardTitle : {
    method: A.methodTitle, details: A.detailsTitle, review: A.reviewTitle,
    record: A.savedTitle, qr: A.qrDialogTitle,
  }[step];

  return (
    <AdminDialog id='admin-registration' title={title} drawer='right' icon={!discarding && step === 'method' ? 'registration' : undefined} onClose={requestClose}>
      {discarding ? <>
        <p className='admin-description'>{A.discardDescription}</p>
        <div className='admin-actions'>
          <button type='button' className='btn btn-secondary' onClick={() => setDiscarding(false)}>{A.keepDraft}</button>
          <button type='button' className='btn' onClick={() => {
            onClose();
            notify({ title: A.draftDiscarded, description: A.draftDiscardedNotice, type: 'success', language: 'en' });
          }}>{A.discard}</button>
        </div>
      </> : step === 'method' ? <>
        <p className='admin-description'>{A.methodDescription}</p>
        <div className='admin-methods'>
          {(['manual', 'scan'] as const).map((value) => <button type='button' key={value} onClick={() => choose(value)}>
            <AdminIcon name={value} />
            <span><strong>{A[value]}</strong><small>{value === 'manual' ? A.manualHint : A.scanHint}</small></span>
            <AdminIcon name='arrow' />
          </button>)}
        </div>
      </> : step === 'details' ? <>
        <p className='admin-eyebrow'>{method === 'manual' ? A.manualStep : A.scanStep}</p>
        <p className='admin-description'>{A.detailsDescription}</p>
        {method === 'scan' && <section className='admin-callout'>
          <div className='flex items-center gap-3'><AdminIcon name='scan' /><strong>{A.scan}</strong></div>
          <p id='admin-scan-unavailable'>{A.scanUnavailable}</p>
          <div className='admin-actions'>
            <button type='button' className='btn btn-secondary' disabled aria-describedby='admin-scan-unavailable'>{A.scanAction}</button>
            <button type='button' className='btn' onClick={() => choose('manual')}>{A.scanFallback}</button>
          </div>
        </section>}
        <form onSubmit={review} noValidate autoComplete='off'>
          <label className='admin-consent'>
            <input id='registration-consent' type='checkbox' checked={draft.consent}
              aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'registration-consent-error' : undefined}
              onChange={(event) => { setDraft({ ...draft, consent: event.target.checked }); setErrors({ ...errors, consent: undefined }); }} />
            <span>{method === 'scan' ? A.scanConsent : A.consent}</span>
          </label>
          {errors.consent && <p id='registration-consent-error' className='admin-error' role='alert'>{errors.consent}</p>}
          <fieldset className='admin-form-grid' disabled={method === 'scan'}>
            <legend className='sr-only'>{A.detailsTitle}</legend>
            {fields.map(({ key, label }) => <div className={key === 'fullName' || key === 'line1' ? 'sm:col-span-2' : ''} key={key}>
              <label className='admin-field' htmlFor={'registration-' + key}>{label}
                <input id={'registration-' + key} name={key} type={key === 'birthDate' ? 'date' : key === 'phone' ? 'tel' : 'text'}
                  max={key === 'birthDate' ? isoDate(new Date()) : undefined} required={!optional.has(key)}
                  inputMode={key === 'phone' ? 'tel' : undefined}
                  maxLength={key === 'birthDate' ? undefined : key === 'phone' ? 20 : 150} value={draft[key]}
                  aria-invalid={!!errors[key]} aria-describedby={errors[key] ? 'registration-' + key + '-error' : undefined}
                  onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setErrors({ ...errors, [key]: undefined }); }} />
              </label>
              {errors[key] && <p id={'registration-' + key + '-error'} className='admin-error' role='alert'>{errors[key]}</p>}
            </div>)}
          </fieldset>
          <p className='admin-privacy'><AdminIcon name='privacy' />{A.privacy}</p>
          <div className='admin-dialog-actions'>
            <button type='button' className='btn btn-secondary' onClick={() => setStep('method')}>{A.back}</button>
            <button type='submit' className='btn' disabled={method === 'scan'}>{A.review}</button>
          </div>
        </form>
      </> : step === 'review' ? <>
        <p className='admin-eyebrow'>{A.reviewStep}</p>
        <p className='admin-description'>{A.reviewDescription}</p>
        <Details draft={draft} />
        {saveError ? <p className='admin-error' role='alert'>{saveError}</p> : null}
        <div className='admin-dialog-actions'>
          <button type='button' className='btn btn-secondary' onClick={() => setStep('details')} disabled={saving}>{A.edit}</button>
          <button type='button' className='btn' onClick={save} disabled={saving}>{saving ? A.saving : A.confirm}</button>
        </div>
      </> : step === 'record' && saved ? <>
        <p className='admin-description'>{A.savedNotice}</p>
        <UserDetails user={saved} />
        <div className='admin-dialog-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>{A.close}</button>
          <button type='button' className='btn' onClick={() => setStep('qr')}>{A.openQr}</button>
        </div>
      </> : saved ? <>
        <QrInvitation user={saved} />
        <div className='admin-dialog-actions'>
          <button type='button' className='btn btn-secondary' onClick={() => setStep('record')}>{A.back}</button>
          <button type='button' className='btn' onClick={onClose}>{A.close}</button>
        </div>
      </> : null}
    </AdminDialog>
  );
}
