import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../../components/auth/AuthShell';
import { Checkbox, Field, FormError, PasswordField, SubmitButton } from '../../components/auth/fields';
import { ArrowRightIcon, MailIcon } from '../../components/auth/icons';
import { loadAdminToken, saveAdminToken } from '../../config/ws';
import { login, WsApiError } from '../../lib/ws-api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loadAdminToken()) {
    return <Navigate to="/admin" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const next: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter your work email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      saveAdminToken(res.token, remember);
      navigate('/admin');
    } catch (err) {
      setFormError(
        err instanceof WsApiError
          ? err.status === 401
            ? 'Incorrect email or password.'
            : err.message || 'Sign-in failed. Please try again.'
          : 'Cannot reach the server. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      portal="admin"
      headline="Registration and field-support console."
      tagline="Register farmers, issue QR invites, and review the audit trail. Rehistro, QR invite, at audit sa iisang lugar."
      points={['Role-based access for coordinators and agronomists', 'Every action is written to the audit log', 'Farmer ID images are never stored']}
      badge="Ugatan Staff Portal"
    >
      <h2 className="m-0 text-xl font-semibold text-ink">Staff sign in</h2>
      <p className="mb-6 mt-1 text-sm text-mist">Use your work email. Authorized personnel only.</p>

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field
          label="Work email"
          icon={<MailIcon />}
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="name@organization.ph"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          aria-label="Work email"
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          showLabel="Show password"
          hideLabel="Hide password"
          aria-label="Password"
        />
        <Checkbox label="Remember me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <FormError>{formError}</FormError>
        <SubmitButton busy={busy} busyLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <hr className="my-6 border-0 border-t border-rule" />
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sage no-underline hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        Looking for the Farmer portal? Go to Farmer Login
        <ArrowRightIcon className="size-4" />
      </Link>
    </AuthShell>
  );
}
