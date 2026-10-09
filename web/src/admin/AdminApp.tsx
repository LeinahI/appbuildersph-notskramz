import { FormEvent, useEffect, useRef, useState, type MouseEvent } from 'react';
import { A } from './copy';
import { DisplayPreferencesPanel } from '../components/DisplayPreferencesPanel';
import { DisplayPreferencesIcon } from '../components/DisplayPreferencesIcon';
import { loadAdminToken, saveAdminToken } from '../config/ws';
import { login, WsApiError } from '../lib/ws-api';
import { AdminDialog, AdminIcon, type IconName } from './AdminDialog';
import { RegistrationDialog } from './RegistrationDialog';

export const pages = ['login', 'overview', 'users', 'qr', 'activity'] as const;
export type AdminPage = (typeof pages)[number];
export function adminPage(hash: string): AdminPage {
  const page = hash.replace(/^#/, '');
  return pages.includes(page as AdminPage) ? page as AdminPage : 'login';
}

const ADMIN_HOME = '/admin/overview';

const navigation: { id: Exclude<AdminPage, 'login'>; icon: IconName; label: string }[] = [
  { id: 'overview', icon: 'overview', label: A.overview },
  { id: 'users', icon: 'users', label: A.users },
  { id: 'qr', icon: 'qr', label: A.qr },
  { id: 'activity', icon: 'activity', label: A.activity },
];
const pageCopy = {
  overview: { title: A.overviewTitle, description: A.overviewDescription },
  users: { title: A.usersTitle, description: A.usersDescription },
  qr: { title: A.qrTitle, description: A.qrDescription },
  activity: { title: A.activityTitle, description: A.activityDescription },
};

function Logo() {
  return <img className='admin-logo' src='/UgatanLogo.png' width={3504} height={1827} alt='Ugatan' />;
}

function Navigation({
  page,
  hrefFor,
  onNavigate,
  onSelect,
}: {
  page: AdminPage;
  hrefFor: (id: AdminPage) => string;
  onNavigate?: (id: AdminPage) => void;
  onSelect?: () => void;
}) {
  return (
    <nav aria-label={A.menuTitle} className='admin-nav'>
      {navigation.map(({ id, icon, label }) => (
        <a
          key={id}
          href={hrefFor(id)}
          aria-current={page === id ? 'page' : undefined}
          onClick={(event) => {
            if (!onNavigate) {
              onSelect?.();
              return;
            }
            event.preventDefault();
            onNavigate(id);
            onSelect?.();
          }}
        >
          <AdminIcon name={icon} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

export function UserList({ qr = false }: { qr?: boolean }) {
  return (
    <section className='admin-panel' aria-labelledby='admin-list-heading'>
      <div className='admin-panel-heading'>
        <h2 id='admin-list-heading'>{qr ? A.accessList : A.allUsers}</h2>
        <div className='admin-filters'>
          <label className='admin-field flex-1'>
            {A.search}
            <input type='search' disabled aria-describedby='admin-data-unavailable' />
          </label>
          <label className='admin-field'>
            {A.filter}
            <select disabled aria-describedby='admin-data-unavailable'>
              <option>{A.allStatuses}</option>
            </select>
          </label>
        </div>
      </div>
      <div className='admin-table-head' aria-hidden='true'>
        <span>{A.userColumn}</span>
        <span>{A.statusColumn}</span>
        <span>{A.registeredColumn}</span>
      </div>
      <div className='admin-empty'>
        <span className='admin-icon-tile'>
          <AdminIcon name={qr ? 'qr' : 'users'} />
        </span>
        <h3>{A.noUsers}</h3>
        <p id='admin-data-unavailable'>{A.unavailableList}</p>
      </div>
      <p className='admin-panel-footer'>
        <AdminIcon name='privacy' />
        {A.privacy}
      </p>
    </section>
  );
}

function Overview({ onRegister }: { onRegister: () => void }) {
  const metrics: { label: string; icon: IconName }[] = [
    { label: A.registered, icon: 'registered-count' },
    { label: A.active, icon: 'active-count' },
    { label: A.pending, icon: 'pending-count' },
    { label: A.today, icon: 'today-count' },
  ];
  return (
    <>
      <div className='admin-metrics'>
        {metrics.map(({ label, icon }) => (
          <section className='admin-metric' key={label}>
            <div>
              <h2>{label}</h2>
              <span className='admin-icon-tile'>
                <AdminIcon name={icon} />
              </span>
            </div>
            <p className='admin-metric-value' aria-label={A.noMetrics}>
              —
            </p>
            <p className='admin-description'>{A.noMetrics}</p>
          </section>
        ))}
      </div>
      <section className='admin-registration-callout'>
        <span className='admin-icon-tile'>
          <AdminIcon name='users' />
        </span>
        <div>
          <h2>{A.startTitle}</h2>
          <p>{A.startDescription}</p>
        </div>
        <button type='button' className='btn' onClick={onRegister}>
          {A.register}
        </button>
      </section>
      <section className='admin-panel'>
        <div className='admin-panel-heading'>
          <h2>{A.hubActivity}</h2>
        </div>
        <div className='admin-empty'>
          <p>{A.noActivity}</p>
          <p>{A.unavailableList}</p>
        </div>
      </section>
    </>
  );
}

export function Login({ onSignedIn }: { onSignedIn?: () => void } = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loadAdminToken()) return;
    if (onSignedIn) onSignedIn();
    else window.location.replace(ADMIN_HOME);
  }, [onSignedIn]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setError(A.emailRequired);
      return;
    }
    if (!password) {
      setError(A.passwordRequired);
      return;
    }
    setBusy(true);
    try {
      const res = await login(trimmed, password);
      saveAdminToken(res.token, true);
      if (onSignedIn) onSignedIn();
      else window.location.assign(ADMIN_HOME);
    } catch (err) {
      setError(err instanceof WsApiError && err.status === 401 ? A.loginFailed : A.loginOffline);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className='admin-login'>
      <section className='admin-login-card' aria-labelledby='admin-login-heading'>
        <Logo />
        <p className='admin-eyebrow'>{A.workspace}</p>
        <h1 id='admin-login-heading'>{A.login}</h1>
        <p className='admin-description'>{A.loginDescription}</p>
        <form onSubmit={onSubmit}>
          <label className='admin-field' htmlFor='admin-email'>
            {A.email}
            <input
              id='admin-email'
              type='email'
              inputMode='email'
              autoComplete='username'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className='admin-field mt-4' htmlFor='admin-password'>
            {A.password}
          </label>
          <div className='admin-password'>
            <input
              id='admin-password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <button
              type='button'
              aria-label={showPassword ? A.hidePassword : A.showPassword}
              title={showPassword ? A.hidePassword : A.showPassword}
              aria-controls='admin-password'
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              <svg
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.7'
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden={true}
              >
                <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z' />
                <circle cx='12' cy='12' r='3' />
                {showPassword && <path d='m3 3 18 18' />}
              </svg>
            </button>
          </div>
          {error ? (
            <p role='alert' className='admin-callout'>
              {error}
            </p>
          ) : null}
          <button type='submit' className='btn w-full' disabled={busy}>
            {busy ? 'Signing in…' : A.signIn}
          </button>
        </form>
        <a className='admin-text-button' href='/chat'>
          {A.backHome}
        </a>
      </section>
    </main>
  );
}

export type AdminAppProps = {
  /** Controlled page (SPA `/admin/:page`). When omitted, hash routing is used (`admin-preview.html`). */
  page?: AdminPage;
  onNavigate?: (page: AdminPage) => void;
};

export function AdminApp({ page: pageProp, onNavigate }: AdminAppProps = {}) {
  const [hashPage, setHashPage] = useState<AdminPage>(() =>
    adminPage(typeof window === 'undefined' ? '' : window.location.hash),
  );
  const page = pageProp ?? hashPage;
  const [dialog, setDialog] = useState<'registration' | 'menu' | 'help' | 'hub' | 'display' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (pageProp !== undefined) return;
    const onHash = () => setHashPage(adminPage(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [pageProp]);

  useEffect(() => {
    document.title = 'Ugatan | ' + A[page];
    document.documentElement.lang = 'en';
    heading.current?.focus();
  }, [page]);

  const hrefFor = (id: AdminPage) => (onNavigate ? (id === 'login' ? '/admin/login' : `/admin/${id}`) : `#${id}`);
  const go = (id: AdminPage, event?: MouseEvent) => {
    if (!onNavigate) return;
    event?.preventDefault();
    onNavigate(id);
  };
  const register = () => setDialog('registration');

  return (
    <>
      {page === 'login' ? (
        <Login onSignedIn={onNavigate ? () => onNavigate('overview') : undefined} />
      ) : (
        <div className='admin-shell'>
          <a
            className='admin-skip-link'
            href='#admin-main'
            onClick={(event) => {
              event.preventDefault();
              document.getElementById('admin-main')?.focus();
            }}
          >
            {A.skipContent}
          </a>
          <aside className='admin-sidebar'>
            <a href={hrefFor('overview')} aria-label='Ugatan' onClick={(e) => go('overview', e)}>
              <Logo />
            </a>
            <p className='admin-eyebrow'>{A.workspace}</p>
            <div className='admin-hub'>
              <AdminIcon name='hub' />
              <span>
                {A.hubTitle}
                <small>{A.notConfigured}</small>
              </span>
            </div>
            <Navigation page={page} hrefFor={hrefFor} onNavigate={onNavigate} />
            <p className='admin-connection'>
              <AdminIcon name='lock' />
              {A.disconnected}
            </p>
            <div className='admin-sidebar-bottom'>
              <button
                type='button'
                className='admin-nav-action'
                onClick={() => setDialog('display')}
                aria-haspopup='dialog'
                aria-controls='admin-display'
              >
                <DisplayPreferencesIcon />
                <span>Display preferences</span>
              </button>
              <button type='button' className='admin-nav-action' onClick={() => setDialog('hub')}>
                <AdminIcon name='settings' />
                {A.hubInfo}
              </button>
              <button type='button' className='admin-nav-action' onClick={() => setDialog('help')}>
                <AdminIcon name='help' />
                {A.help}
              </button>
              <a className='admin-nav-action' href={hrefFor('login')} onClick={(e) => go('login', e)}>
                {A.login}
              </a>
            </div>
          </aside>
          <div className='admin-workspace'>
            <header className='admin-header'>
              <button
                type='button'
                className='admin-menu-button'
                onClick={() => setDialog('menu')}
                aria-haspopup='dialog'
                aria-controls='admin-menu'
              >
                {A.menu}
              </button>
              <p className='admin-breadcrumb'>
                <span>{A.workspace}</span>
                <span aria-hidden='true'>/</span>
                <strong>{A[page]}</strong>
              </p>
              <span className='admin-preview-badge'>{A.preview}</span>
              <button
                type='button'
                className='chat-icon-button lg:hidden'
                onClick={() => setDialog('help')}
                aria-label={A.help}
                title={A.help}
              >
                <AdminIcon name='help' />
              </button>
            </header>
            <main id='admin-main' tabIndex={-1} className='admin-main'>
              <div className='admin-page-heading'>
                <div>
                  <p className='admin-eyebrow'>UGATAN ADMIN HUB</p>
                  <h1 ref={heading} tabIndex={-1}>
                    {pageCopy[page].title}
                  </h1>
                  <p>{pageCopy[page].description}</p>
                </div>
                <button
                  type='button'
                  className='btn admin-register-button'
                  onClick={register}
                  aria-haspopup='dialog'
                  aria-controls='admin-registration'
                >
                  <AdminIcon name='plus' />
                  {A.register}
                </button>
              </div>
              <p className='admin-preview-notice'>{A.previewNotice}</p>
              {page === 'overview' ? (
                <Overview onRegister={register} />
              ) : page === 'activity' ? (
                <section className='admin-panel'>
                  <div className='admin-panel-heading'>
                    <h2>{A.hubActivity}</h2>
                  </div>
                  <div className='admin-empty'>
                    <span className='admin-icon-tile'>
                      <AdminIcon name='activity' />
                    </span>
                    <h3>{A.noActivity}</h3>
                    <p>{A.unavailableList}</p>
                  </div>
                </section>
              ) : (
                <UserList qr={page === 'qr'} />
              )}
              <footer className='admin-footer'>
                <span>{A.adminTitle}</span>
                <a href='/'>{A.backHome}</a>
              </footer>
            </main>
          </div>
        </div>
      )}
      {dialog === 'registration' && <RegistrationDialog onClose={() => setDialog(null)} />}
      {dialog === 'menu' && (
        <AdminDialog id='admin-menu' title={A.menuTitle} drawer='left' onClose={() => setDialog(null)}>
          <Navigation page={page} hrefFor={hrefFor} onNavigate={onNavigate} onSelect={() => setDialog(null)} />
          <button
            type='button'
            className='admin-nav-action'
            onClick={() => setDialog('display')}
            aria-haspopup='dialog'
            aria-controls='admin-display'
          >
            <DisplayPreferencesIcon />
            <span>Display preferences</span>
          </button>
          <button type='button' className='admin-nav-action' onClick={() => setDialog('hub')}>
            <AdminIcon name='settings' />
            {A.hubInfo}
          </button>
          <button type='button' className='admin-nav-action' onClick={() => setDialog('help')}>
            <AdminIcon name='help' />
            {A.help}
          </button>
          <a
            className='admin-nav-action'
            href={hrefFor('login')}
            onClick={(e) => {
              go('login', e);
              setDialog(null);
            }}
          >
            {A.login}
          </a>
        </AdminDialog>
      )}
      {dialog === 'display' && (
        <AdminDialog id='admin-display' title='Display preferences' onClose={() => setDialog(null)}>
          <DisplayPreferencesPanel language='en' id='admin-display-options' />
        </AdminDialog>
      )}
      {dialog === 'help' && (
        <AdminDialog id='admin-help' title={A.helpTitle} onClose={() => setDialog(null)}>
          <ol className='admin-help-steps'>
            {A.helpSteps.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ol>
          <p className='admin-callout'>{A.helpPrivacy}</p>
        </AdminDialog>
      )}
      {dialog === 'hub' && (
        <AdminDialog id='admin-hub-info' title={A.hubInfo} onClose={() => setDialog(null)}>
          <p className='admin-description'>{A.hubInfoDescription}</p>
          <dl className='admin-details'>
            <div>
              <dt>{A.hubName}</dt>
              <dd>{A.notConfigured}</dd>
            </div>
            <div>
              <dt>{A.location}</dt>
              <dd>{A.notConfigured}</dd>
            </div>
            <div>
              <dt>{A.qr}</dt>
              <dd>{A.qrPolicy}</dd>
            </div>
          </dl>
          <p className='admin-callout'>{A.backendRequired}</p>
        </AdminDialog>
      )}
    </>
  );
}
