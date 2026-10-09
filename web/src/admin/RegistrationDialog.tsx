import { useEffect, useState, type FormEvent } from 'react';
import { A } from './copy';
import { notify } from '../components/ToastHost';
import { AdminDialog, AdminIcon } from './AdminDialog';
import { emptyDraft, fields, hasDraft, validateDraft, type Draft, type DraftErrors, type Method } from './registration';

function Details({ draft }: { draft: Draft }) {
  return <dl className='admin-details'>
    {fields.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{draft[key].trim()}</dd></div>)}
    <div><dt>{A.initialStatus}</dt><dd><span className='admin-status'>{A.pending}</span></dd></div>
  </dl>;
}

export function QrInvitation() {
  return <>
    <div className='admin-qr-placeholder'>
      <AdminIcon name='qr' />
      <strong>{A.qrUnavailable}</strong>
    </div>
    <p className='admin-description'>{A.qrRequirement}</p>
    <p className='admin-policy'>{A.qrPolicy}</p>
    <p id='admin-qr-unavailable' className='admin-callout'>{A.actionUnavailable}</p>
    <div className='admin-actions'>
      <button type='button' className='btn' disabled aria-describedby='admin-qr-unavailable'>{A.generateQr}</button>
      <button type='button' className='btn btn-secondary' disabled aria-describedby='admin-qr-unavailable'>{A.regenerateQr}</button>
      <button type='button' className='btn btn-secondary' disabled aria-describedby='admin-qr-unavailable'>{A.downloadQr}</button>
    </div>
  </>;
}

export function DraftRecord({ draft, onQr }: { draft: Draft; onQr: () => void }) {
  return <>
    <p className='admin-description'>{A.recordPreviewNotice}</p>
    <Details draft={draft} />
    <dl className='admin-details'>
      <div><dt>{A.accountAccess}</dt><dd>{A.notLinked}</dd></div>
      <div><dt>{A.consentRecorded}</dt><dd>{A.consentYes}</dd></div>
    </dl>
    <div className='admin-actions'>
      <button type='button' className='btn' onClick={onQr}>{A.openQrPreview}</button>
      <button type='button' className='btn btn-secondary' disabled aria-describedby='admin-record-unavailable'>{A.revokeAccess}</button>
    </div>
    <p id='admin-record-unavailable' className='admin-description'>{A.noRecordActions}</p>
    <button type='button' className='admin-text-button' disabled aria-describedby='admin-record-unavailable'>{A.viewActivity}</button>
  </>;
}

export function RegistrationDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'method' | 'details' | 'review' | 'record' | 'qr'>('method');
  const [method, setMethod] = useState<Method>('manual');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [discarding, setDiscarding] = useState(false);
  useEffect(() => {
    if (!hasDraft(draft)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);

  function choose(next: Method) {
    setMethod(next);
    setDraft((value) => ({ ...value, consent: false }));
    setErrors({});
    setStep('details');
  }
  function requestClose() {
    if (discarding) setDiscarding(false);
    else if (hasDraft(draft)) setDiscarding(true);
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
  const title = discarding ? A.discardTitle : {
    method: A.methodTitle, details: A.detailsTitle, review: A.reviewTitle,
    record: A.recordPreviewTitle, qr: A.qrDialogTitle,
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
            {fields.map(({ key, label }) => <div className={key === 'fullName' ? 'sm:col-span-2' : ''} key={key}>
              <label className='admin-field' htmlFor={'registration-' + key}>{label}
                <input id={'registration-' + key} name={key} type={key === 'age' ? 'number' : 'text'}
                  min={key === 'age' ? 0 : undefined} step={key === 'age' ? 1 : undefined} required
                  maxLength={key === 'age' ? undefined : 150} value={draft[key]}
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
        <p id='admin-save-unavailable' className='admin-callout'>{A.validationNotice}</p>
        <div className='admin-dialog-actions'>
          <button type='button' className='btn btn-secondary' onClick={() => setStep('details')}>{A.edit}</button>
          <button type='button' className='btn' disabled aria-describedby='admin-save-unavailable'>{A.confirm}</button>
        </div>
        <button type='button' className='admin-text-button mt-4' onClick={() => setStep('record')}>{A.previewRecord}</button>
      </> : step === 'record' ? <>
        <DraftRecord draft={draft} onQr={() => setStep('qr')} />
        <div className='admin-dialog-actions'><button type='button' className='btn btn-secondary' onClick={() => setStep('review')}>{A.back}</button></div>
      </> : <>
        <QrInvitation />
        <div className='admin-dialog-actions'><button type='button' className='btn btn-secondary' onClick={() => setStep('record')}>{A.back}</button></div>
      </>}
    </AdminDialog>
  );
}
