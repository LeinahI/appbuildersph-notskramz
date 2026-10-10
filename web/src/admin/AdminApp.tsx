import { FormEvent, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { A } from './copy';
import { DisplayPreferencesPanel } from '../components/DisplayPreferencesPanel';
import { DisplayPreferencesIcon } from '../components/DisplayPreferencesIcon';
import { DEFAULT_WS_URL, loadAdminToken, saveAdminToken } from '../config/ws';
import { listAudit, listUsers, login, me, userStats, WsApiError, type AuditDTO, type UserDTO, type UserStatsDTO } from '../lib/ws-api';
import { AdminDialog, AdminIcon, type IconName } from './AdminDialog';
import { RegistrationDialog } from './RegistrationDialog';
import { StatusPill, UserDrawer, formatDate } from './UserPanel';

export const pages = ['login', 'overview', 'users', 'qr', 'activity'] as const;
export type AdminPage = (typeof pages)[number];
export function adminPage(hash: string): AdminPage {
  const page = hash.replace(/^#/, '');
  return pages.includes(page as AdminPage) ? page as AdminPage : 'login';
}

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

type Connection = 'checking' | 'connected' | 'offline';
/** ws returns at most this many users per list. */
const LIST_LIMIT = 50;
export type Load<T> = { data: T | null; error: boolean };

/** Loads `fetcher` whenever `deps` change; keeps the last good data and flags a failed load. */
function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[], onUnauthorized: () => void): Load<T> {
  const [state, setState] = useState<Load<T>>({ data: null, error: false });
  useEffect(() => {
    let live = true;
    fetcher()
      .then((data) => {
        if (live) setState({ data, error: false });
      })
      .catch((err) => {
        if (!live) return;
        if (err instanceof WsApiError && err.status === 401) onUnauthorized();
        setState((prev) => ({ data: prev.data, error: true }));
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers list what should trigger a reload
  }, deps);
  return state;
}

function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <div className='admin-empty'>
      <span className='admin-icon-tile'>
        <AdminIcon name={icon} />
      </span>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

export function UserList({
  qr = false,
  users = null,
  error = false,
  query = '',
  status = '',
  onQuery,
  onStatus,
  onOpen,
}: {
  qr?: boolean;
  users?: UserDTO[] | null;
  error?: boolean;
  query?: string;
  status?: string;
  onQuery?: (value: string) => void;
  onStatus?: (value: string) => void;
  onOpen?: (id: string) => void;
}) {
  const filtered = !!query.trim() || (!qr && !!status);
  const icon = qr ? 'qr' : 'users';
  return (
    <section className='admin-panel' aria-labelledby='admin-list-heading'>
      <div className='admin-panel-heading'>
        <h2 id='admin-list-heading'>{qr ? A.accessList : A.allUsers}</h2>
        {qr ? <p className='admin-description'>{A.pendingOnly}</p> : null}
        <div className='admin-filters'>
          <label className='admin-field flex-1'>
            {A.search}
            <input type='search' value={query} onChange={(e) => onQuery?.(e.target.value)} />
          </label>
          {qr ? null : (
            <label className='admin-field'>
              {A.filter}
              <select value={status} onChange={(e) => onStatus?.(e.target.value)}>
                <option value=''>{A.allStatuses}</option>
                <option value='pending'>{A.pending}</option>
                <option value='active'>{A.active}</option>
                <option value='revoked'>{A.revoked}</option>
              </select>
            </label>
          )}
        </div>
      </div>
      <div className='admin-table-head' aria-hidden='true'>
        <span>{A.userColumn}</span>
        <span>{A.statusColumn}</span>
        <span>{A.registeredColumn}</span>
      </div>
      {users && users.length > 0 ? (
        <ul className='admin-rows'>
          {users.map((user) => (
            <li key={user.id}>
              <button type='button' className='admin-row' onClick={() => onOpen?.(user.id)} aria-haspopup='dialog'>
                <span>
                  <strong>{user.fullName}</strong>
                  <small>{[user.address?.barangay, user.address?.city].filter(Boolean).join(', ') || user.phone || '—'}</small>
                </span>
                <span>
                  <StatusPill status={user.status} />
                </span>
                <span>{formatDate(user.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : error ? (
        <EmptyState icon={icon} title={A.noUsers} body={A.unavailableList} />
      ) : users ? (
        <EmptyState icon={icon} title={filtered ? A.noMatches : A.noUsers} />
      ) : (
        <EmptyState icon={icon} title={A.loading} />
      )}
      {users && users.length >= LIST_LIMIT ? <p className='admin-description admin-list-cap'>{A.listCapped}</p> : null}
      <p className='admin-panel-footer'>
        <AdminIcon name='privacy' />
        {A.privacy}
      </p>
    </section>
  );
}

export function ActivityList({
  items,
  error = false,
  names,
  limit,
}: {
  items: AuditDTO[] | null;
  error?: boolean;
  names?: Map<string, string>;
  limit?: number;
}) {
  if (!items) {
    return <EmptyState icon='activity' title={error ? A.noActivity : A.loading} body={error ? A.unavailableList : undefined} />;
  }
  if (items.length === 0) return <EmptyState icon='activity' title={A.noActivity} />;
  return (
    <ol className='admin-rows'>
      {items.slice(0, limit).map((event) => (
        <li key={event.id} className='admin-row admin-row-static'>
          <span>
            <strong>{A.events[event.eventType] ?? event.eventType}</strong>
            <small>{names?.get(event.subjectId) ?? (event.subjectId ? event.subjectId.slice(0, 8) : '—')}</small>
          </span>
          <span />
          <span>{formatDate(event.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}

export function Overview({
  stats,
  activity,
  names,
  onRegister,
  viewAll,
}: {
  stats: Load<UserStatsDTO | null>;
  activity: Load<AuditDTO[]>;
  names?: Map<string, string>;
  onRegister: () => void;
  viewAll?: ReactNode;
}) {
  const metrics: { label: string; icon: IconName; value?: number }[] = [
    { label: A.registered, icon: 'registered-count', value: stats.data?.total },
    { label: A.active, icon: 'active-count', value: stats.data?.active },
    { label: A.pending, icon: 'pending-count', value: stats.data?.pending },
    { label: A.today, icon: 'today-count', value: stats.data?.today },
  ];
  return (
    <>
      <div className='admin-metrics'>
        {metrics.map(({ label, icon, value }) => (
          <section className='admin-metric' key={label}>
            <div>
              <h2>{label}</h2>
              <span className='admin-icon-tile'>
                <AdminIcon name={icon} />
              </span>
            </div>
            {value === undefined ? (
              <>
                {/* Unknown is shown as a dash, never as zero. */}
                <p className='admin-metric-value' aria-label={A.noMetrics}>
                  —
                </p>
                <p className='admin-description'>{stats.error ? A.noMetrics : A.loading}</p>
              </>
            ) : (
              <p className='admin-metric-value'>{value.toLocaleString('en-PH')}</p>
            )}
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
        <div className='admin-panel-heading admin-panel-heading-row'>
          <h2>{A.recentActivity}</h2>
          {viewAll}
        </div>
        <ActivityList items={activity.data} error={activity.error} names={names} limit={5} />
      </section>
    </>
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
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>('checking');
  const [admin, setAdmin] = useState<UserDTO | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  // Bumped after a save, revoke, or retry so every list reloads.
  const [version, setVersion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const workspace = page !== 'login';

  const hrefFor = (id: AdminPage) => (onNavigate ? (id === 'login' ? '/admin/login' : `/admin/${id}`) : `#${id}`);
  const go = (id: AdminPage, event?: MouseEvent) => {
    if (!onNavigate) return;
    event?.preventDefault();
    onNavigate(id);
  };
  function signOut() {
    saveAdminToken('');
    setAdmin(null);
    setDialog(null);
    setOpenUser(null);
    if (onNavigate) onNavigate('login');
    else window.location.hash = '#login';
  }
  const refresh = () => setVersion((v) => v + 1);
  const register = () => setDialog('registration');

  useEffect(() => {
    if (pageProp !== undefined) return;
    const onHash = () => setHashPage(adminPage(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [pageProp]);

  useEffect(() => {
    if (page === 'login') {
      window.location.replace('/admin/login');
      return;
    }
    document.title = 'Ugatan | ' + A[page];
    document.documentElement.lang = 'en';
    heading.current?.focus();
  }, [page]);

  // Confirm the saved token with ws. A rejected token signs out; an unreachable ws only shows offline.
  useEffect(() => {
    if (!workspace) return;
    let live = true;
    setConnection('checking');
    me()
      .then((value) => {
        if (!live) return;
        setAdmin(value);
        setConnection('connected');
      })
      .catch((err) => {
        if (!live) return;
        if (err instanceof WsApiError && err.status === 401) signOut();
        else setConnection('offline');
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recheck on entering the workspace or after a retry
  }, [workspace, version]);

  // Typing waits a moment before asking ws.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const listed = page === 'users' || page === 'qr';
  const listStatus = page === 'qr' ? 'pending' : status;
  // Overview and activity also load users, to put names beside activity entries.
  const users = useLoad(
    () => (workspace ? listUsers(listed ? search : undefined, listed ? listStatus : undefined) : Promise.resolve([])),
    [page, search, listStatus, version],
    signOut,
  );
  const stats = useLoad(() => (page === 'overview' ? userStats() : Promise.resolve(null)), [page, version], signOut);
  const activity = useLoad(
    () => (page === 'overview' || page === 'activity' ? listAudit() : Promise.resolve([])),
    [page, version],
    signOut,
  );
  const names = new Map((users.data ?? []).map((user) => [user.id, user.fullName]));
  const connectionText = connection === 'connected' ? A.connected : connection === 'checking' ? A.checking : A.disconnected;

  const sideActions = (
    <>
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
      <button type='button' className='admin-nav-action' onClick={signOut}>
        <AdminIcon name='lock' />
        {A.logout}
      </button>
    </>
  );

  if (page === 'login') return <main className='p-6'><a className='admin-text-button' href='/admin/login'>{A.login}</a></main>;

  return (
    <>
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
                <small>{admin?.email || admin?.fullName || connectionText}</small>
              </span>
            </div>
            <Navigation page={page} hrefFor={hrefFor} onNavigate={onNavigate} />
            <p className='admin-connection' role='status' data-state={connection}>
              <AdminIcon name='lock' />
              <span>{connection === 'connected' ? A.connectedDescription : connectionText}</span>
            </p>
            <div className='admin-sidebar-bottom'>{sideActions}</div>
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
              <span className='admin-status-badge' data-state={connection}>
                {connectionText}
              </span>
              <button
                type='button'
                className='chat-icon-button ml-auto lg:hidden'
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
              {connection === 'offline' ? (
                <p className='admin-status-notice' role='alert'>
                  {A.unavailableList}{' '}
                  <button type='button' className='admin-text-button' onClick={refresh}>
                    {A.retry}
                  </button>
                </p>
              ) : null}
              {page === 'overview' ? (
                <Overview
                  stats={stats}
                  activity={activity}
                  names={names}
                  onRegister={register}
                  viewAll={
                    <a className='admin-text-button' href={hrefFor('activity')} onClick={(e) => go('activity', e)}>
                      {A.viewAll}
                    </a>
                  }
                />
              ) : page === 'activity' ? (
                <section className='admin-panel'>
                  <div className='admin-panel-heading'>
                    <h2>{A.hubActivity}</h2>
                  </div>
                  <ActivityList items={activity.data} error={activity.error} names={names} />
                </section>
              ) : (
                <UserList
                  qr={page === 'qr'}
                  users={users.data}
                  error={users.error}
                  query={query}
                  status={status}
                  onQuery={setQuery}
                  onStatus={setStatus}
                  onOpen={setOpenUser}
                />
              )}
              <footer className='admin-footer'>
                <span>{A.adminTitle}</span>
                <a href='/'>{A.backHome}</a>
              </footer>
            </main>
          </div>
        </div>
      {dialog === 'registration' && <RegistrationDialog onClose={() => setDialog(null)} onSaved={refresh} />}
      {openUser && <UserDrawer userId={openUser} onClose={() => setOpenUser(null)} onChanged={refresh} />}
      {dialog === 'menu' && (
        <AdminDialog id='admin-menu' title={A.menuTitle} drawer='left' onClose={() => setDialog(null)}>
          <Navigation page={page} hrefFor={hrefFor} onNavigate={onNavigate} onSelect={() => setDialog(null)} />
          {sideActions}
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
              <dd>{A.hubTitle}</dd>
            </div>
            <div>
              <dt>{A.apiAddress}</dt>
              <dd className='font-mono text-xs'>{DEFAULT_WS_URL}</dd>
            </div>
            <div>
              <dt>{A.status}</dt>
              <dd>{connectionText}</dd>
            </div>
            <div>
              <dt>{A.signedInAs}</dt>
              <dd>{admin?.email || admin?.fullName || '—'}</dd>
            </div>
            <div>
              <dt>{A.qr}</dt>
              <dd>{A.qrPolicy}</dd>
            </div>
          </dl>
        </AdminDialog>
      )}
    </>
  );
}
