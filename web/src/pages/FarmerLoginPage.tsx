import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/auth/AuthShell';
import { Field, FormError, PasswordField, SubmitButton, primaryButton } from '../components/auth/fields';
import { ArrowRightIcon, MailIcon } from '../components/auth/icons';
import { createLocalProfile, hasFarmerAccess, loadLocalProfile } from '../config/profile';
import { loadClaimLink, saveClaimLink } from '../config/ws';
import { farmerLogin, isUnavailable, WsApiError } from '../lib/ws-api';
import { chatHref } from '../lib/conversations';

type Lang = 'tl' | 'en';

const LANG_KEY = 'ugatan.authLang';

const COPY = {
  tl: {
    headline: 'Tulong sa palay at mais, kahit walang signal.',
    tagline: 'Magtanong tungkol sa peste at sakit ng pananim. Ang sagot ay nasa wika mo, at gumagana kahit offline.',
    points: ['Larawan at tanong, isang tap lang', 'Gumagana kahit mahina ang signal', 'Para sa mga magsasaka at kooperatiba'],
    badge: 'Portal ng Magsasaka',
    title: 'Mag-sign in',
    subtitle: 'Gamitin ang email at password mo.',
    emailLabel: 'Email',
    emailInvalid: 'Maglagay ng tamang email.',
    passwordLabel: 'Password',
    passwordRequired: 'Ilagay ang password.',
    showPassword: 'Ipakita ang password',
    hidePassword: 'Itago ang password',
    forgot: 'Nakalimutan ang password?',
    forgotNote: 'Para i-reset ang password, makipag-ugnayan sa admin ng inyong kooperatiba.',
    signIn: 'Mag-sign in',
    signingIn: 'Nag-sign in…',
    unavailable: 'Hindi pa magagamit ang paraang ito. Gamitin muna ang QR link na bigay ng admin.',
    failed: 'Hindi makapag-sign in. Subukan ulit.',
    network: 'Walang koneksyon sa server. Tingnan ang internet at subukan ulit.',
    linked: 'May naka-link na device na',
    continueChat: 'Magpatuloy sa chat',
    qrNote: 'Wala pang account? Hilingin sa admin ang QR at i-scan ito sa cellphone na ito.',
    language: 'Wika',
    or: 'o',
    offlineStart: 'Gamitin nang walang account',
    offlineNote: 'Gumagana kahit walang internet. Sa cellphone na ito lang mananatili ang iyong mga usapan. Puwede kang mag-link sa kooperatiba mamaya gamit ang QR.',
    localProfile: 'Ginagamit ang app sa cellphone na ito nang walang account.',
  },
  en: {
    headline: 'Help for rice and corn, even without signal.',
    tagline: 'Ask about crop pests and diseases. Answers come in your language and work offline.',
    points: ['Send a photo and a question in one tap', 'Works with a weak connection', 'Built for farmers and cooperatives'],
    badge: 'Farmer Portal',
    title: 'Sign in',
    subtitle: 'Use your email and password.',
    emailLabel: 'Email',
    emailInvalid: 'Enter a valid email address.',
    passwordLabel: 'Password',
    passwordRequired: 'Enter your password.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    forgot: 'Forgot password?',
    forgotNote: 'To reset your password, contact your cooperative admin.',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    unavailable: 'This sign-in method is not available yet. Use the QR link from your admin for now.',
    failed: 'Could not sign in. Please try again.',
    network: 'Cannot reach the server. Check your connection and try again.',
    linked: 'This device is already linked',
    continueChat: 'Continue to chat',
    qrNote: 'No account yet? Ask your admin for a QR code and scan it on this phone.',
    language: 'Language',
    or: 'or',
    offlineStart: 'Use without an account',
    offlineNote: 'Works without internet. Your chats stay on this phone only. You can link to your cooperative later with a QR.',
    localProfile: 'This phone uses the app without an account.',
  },
} as const;

function loadLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'tl';
  } catch {
    return 'tl';
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FarmerLoginPage() {
  const navigate = useNavigate();
  const claim = loadClaimLink();
  const profile = loadLocalProfile();
  const [lang, setLang] = useState<Lang>(loadLang);
  const t = COPY[lang];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang === 'tl' ? 'fil' : 'en';
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // private window
    }
  }, [lang]);

  function reset() {
    setErrors({});
    setFormError('');
  }

  function failure(err: unknown) {
    if (isUnavailable(err)) setFormError(t.unavailable);
    else if (err instanceof WsApiError) setFormError(err.message || t.failed);
    else setFormError(t.network);
  }

  function finish(session: { userId: string; token: string }) {
    saveClaimLink(session);
    navigate(chatHref());
  }

  /** No server and no account: the chat opens on this phone at once. */
  function startOffline() {
    createLocalProfile();
    navigate(chatHref());
  }

  async function emailSubmit(e: FormEvent) {
    e.preventDefault();
    reset();
    const next: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t.emailInvalid;
    if (!password) next.password = t.passwordRequired;
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setBusy(true);
    try {
      finish(await farmerLogin(email.trim(), password));
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
    }
  }

  const langToggle = (
    <div role="group" aria-label={t.language} className="inline-flex rounded-full border border-line bg-white p-0.5 text-xs font-semibold">
      {(['tl', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${lang === l ? 'bg-forest text-white' : 'text-muted hover:text-ink'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <AuthShell portal="farmer" headline={t.headline} tagline={t.tagline} points={[...t.points]} badge={t.badge} topRight={langToggle}>
      <h2 className="m-0 text-xl font-semibold text-ink">{t.title}</h2>
      <p className="mb-5 mt-1 text-sm text-mist">{t.subtitle}</p>

      {claim ? (
        <div className="mb-5 rounded-xl border border-sprout-line bg-sprout p-4">
          <p className="m-0 text-sm text-ink">
            {t.linked} <span className="text-mist">({claim.userId.slice(0, 8)}…)</span>
          </p>
          <button type="button" className={`${primaryButton} mt-3`} onClick={() => navigate(chatHref())}>
            {t.continueChat}
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
      ) : profile ? (
        <div className="mb-5 rounded-xl border border-sprout-line bg-sprout p-4">
          <p className="m-0 text-sm text-ink">{t.localProfile}</p>
          <button type="button" className={`${primaryButton} mt-3`} onClick={() => navigate(chatHref())}>
            {t.continueChat}
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
      ) : null}

      <form onSubmit={emailSubmit} noValidate className="grid gap-4">
        <Field
          label={t.emailLabel}
          icon={<MailIcon />}
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="pangalan@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          aria-label={t.emailLabel}
        />
        <PasswordField
          label={t.passwordLabel}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          aria-label={t.passwordLabel}
        />
        <div className="flex justify-end">
          <button
            type="button"
            aria-expanded={showForgot}
            onClick={() => setShowForgot((v) => !v)}
            className="text-sm font-medium text-sage underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {t.forgot}
          </button>
        </div>
        {showForgot ? (
          <p role="note" className="m-0 rounded-xl bg-warn px-3.5 py-3 text-sm text-ink">
            {t.forgotNote}
          </p>
        ) : null}
        <FormError>{formError}</FormError>
        <SubmitButton busy={busy} busyLabel={t.signingIn}>
          {t.signIn}
        </SubmitButton>
      </form>

      {!claim && !profile ? (
        <div className="mt-5">
          <p className="m-0 mb-3 flex items-center gap-3 text-xs uppercase tracking-wide text-mist" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            {t.or}
            <span className="h-px flex-1 bg-line" />
          </p>
          <button
            type="button"
            onClick={startOffline}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-forest bg-white px-4 py-3 text-base font-semibold text-forest transition-colors hover:bg-sprout focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {t.offlineStart}
            <ArrowRightIcon className="size-4" />
          </button>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-mist">{t.offlineNote}</p>
        </div>
      ) : null}

      {!claim ? <p className="mb-0 mt-5 text-sm leading-relaxed text-mist">{t.qrNote}</p> : null}
    </AuthShell>
  );
}

/** Guard: a claim link from `ws`, or a profile made on this phone. Neither needs the network to check. */
export function RequireFarmer({ children }: { children: React.ReactNode }) {
  if (!hasFarmerAccess()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
