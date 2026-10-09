import { FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Address, registerUser, WsApiError } from '../../lib/ws-api';

const emptyAddress = (): Address => ({
  line1: '',
  line2: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function setAddr(key: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [key]: value }));
  }

  function onIdFile(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    // ponytail: ID image stays on this device only — never POSTed to ws
    setPreviewUrl(URL.createObjectURL(file));
  }

  function goConfirm(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Consent is required before registration.');
      return;
    }
    if (!fullName.trim() || !birthDate) {
      setError('Name and birth date are required.');
      return;
    }
    if (!address.line1 || !address.barangay || !address.city || !address.province) {
      setError('Complete address (line1, barangay, city, province) is required.');
      return;
    }
    setStep('confirm');
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const u = await registerUser({
        fullName: fullName.trim(),
        birthDate,
        address,
        phone: phone.trim() || undefined,
        idNumber: idNumber.trim() || undefined,
        consentAt: new Date().toISOString(),
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      navigate(`/admin/users/${u.id}`);
    } catch (err) {
      setError(err instanceof WsApiError ? err.message : 'Registration failed');
      setStep('edit');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'confirm') {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Confirm registration</h1>
        <p className="text-sm text-muted">Nothing is saved until you confirm. Review the fields below.</p>
        <dl className="space-y-2 rounded-xl border border-line bg-surface p-4 text-sm">
          <div>
            <dt className="text-muted">Full name</dt>
            <dd className="font-medium">{fullName}</dd>
          </div>
          <div>
            <dt className="text-muted">Birth date</dt>
            <dd className="font-medium">{birthDate}</dd>
          </div>
          <div>
            <dt className="text-muted">Phone</dt>
            <dd className="font-medium">{phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">ID number</dt>
            <dd className="font-medium">{idNumber ? '•••• (hashed on server)' : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Address</dt>
            <dd className="font-medium">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ''}
              <br />
              {address.barangay}, {address.city}, {address.province} {address.postalCode}
            </dd>
          </div>
        </dl>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <div className="flex gap-2">
          <button type="button" className="pill-btn" onClick={() => setStep('edit')} disabled={busy}>
            Edit
          </button>
          <button
            type="button"
            className="pill-btn bg-accent text-white hover:bg-accent-hover"
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Confirm & save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={goConfirm} className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register farmer</h1>
        <p className="text-sm text-muted">Manual entry is primary. Optional ID photo stays on this device for reference.</p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          The farmer consented to collect registration details (name, birth date, address, optional ID number) for
          cooperative onboarding. ID images are not uploaded to the server.
        </span>
      </label>

      <fieldset disabled={!consent} className="space-y-3 disabled:opacity-50">
        <label className="field-label">
          Optional ID photo (on-device only)
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="field-input"
            onChange={(e) => onIdFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {previewUrl ? (
          <img src={previewUrl} alt="ID preview (not uploaded)" className="max-h-48 rounded-lg border border-line" />
        ) : null}

        <label className="field-label">
          Full name
          <input className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label className="field-label">
          Birth date
          <input
            className="field-input"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </label>
        <label className="field-label">
          Phone (optional)
          <input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field-label">
          Government ID number (optional, hashed for duplicates)
          <input className="field-input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        </label>
        <label className="field-label">
          Address line 1
          <input className="field-input" value={address.line1} onChange={(e) => setAddr('line1', e.target.value)} required />
        </label>
        <label className="field-label">
          Address line 2
          <input className="field-input" value={address.line2} onChange={(e) => setAddr('line2', e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field-label">
            Barangay
            <input
              className="field-input"
              value={address.barangay}
              onChange={(e) => setAddr('barangay', e.target.value)}
              required
            />
          </label>
          <label className="field-label">
            City / municipality
            <input className="field-input" value={address.city} onChange={(e) => setAddr('city', e.target.value)} required />
          </label>
          <label className="field-label">
            Province
            <input
              className="field-input"
              value={address.province}
              onChange={(e) => setAddr('province', e.target.value)}
              required
            />
          </label>
          <label className="field-label">
            Postal code
            <input
              className="field-input"
              value={address.postalCode}
              onChange={(e) => setAddr('postalCode', e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <button type="submit" className="pill-btn bg-accent text-white hover:bg-accent-hover" disabled={!consent}>
        Review
      </button>
    </form>
  );
}
