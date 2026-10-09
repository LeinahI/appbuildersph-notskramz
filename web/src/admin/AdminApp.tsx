import { useEffect, useRef, useState } from 'react';
import { A } from './copy';
import { DisplayPreferencesPanel } from '../components/DisplayPreferencesPanel';
import { DisplayPreferencesIcon } from '../components/DisplayPreferencesIcon';
import { AdminDialog, AdminIcon, type IconName } from './AdminDialog';
import { RegistrationDialog } from './RegistrationDialog';

const pages = ['login', 'overview', 'users', 'qr', 'activity'] as const;
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

function Navigation({ page, onSelect }: { page: AdminPage; onSelect?: () => void }) {
  return <nav aria-label={A.menuTitle} className='admin-nav'>
    {navigation.map(({ id, icon, label }) => <a key={id} href={'#' + id} aria-current={page === id ? 'page' : undefined} onClick={onSelect}>
      <AdminIcon name={icon} /><span>{label}</span>
    </a>)}
  </nav>;
}

export function UserList({ qr = false }: { qr?: boolean }) {
  return <section className='admin-panel' aria-labelledby='admin-list-heading'>
    <div className='admin-panel-heading'>
      <h2 id='admin-list-heading'>{qr ? A.accessList : A.allUsers}</h2>
      <div className='admin-filters'>
        <label className='admin-field flex-1'>{A.search}
          <input type='search' disabled aria-describedby='admin-data-unavailable' />
        </label>
        <label className='admin-field'>{A.filter}
          <select disabled aria-describedby='admin-data-unavailable'><option>{A.allStatuses}</option></select>
        </label>
      </div>
    </div>
    <div className='admin-table-head' aria-hidden='true'><span>{A.userColumn}</span><span>{A.statusColumn}</span><span>{A.registeredColumn}</span></div>
    <div className='admin-empty'>
      <span className='admin-icon-tile'><AdminIcon name={qr ? 'qr' : 'users'} /></span>
      <h3>{A.noUsers}</h3>
      <p id='admin-data-unavailable'>{A.unavailableList}</p>
    </div>
    <p className='admin-panel-footer'><AdminIcon name='privacy' />{A.privacy}</p>
  </section>;
}

function Overview({ onRegister }: { onRegister: () => void }) {
  const metrics: { label: string; icon: IconName }[] = [
    { label: A.registered, icon: 'registered-count' }, { label: A.active, icon: 'active-count' },
    { label: A.pending, icon: 'pending-count' }, { label: A.today, icon: 'today-count' },
  ];
  return <>
    <div className='admin-metrics'>
      {metrics.map(({ label, icon }) => <section className='admin-metric' key={label}>
        <div><h2>{label}</h2><span className='admin-icon-tile'><AdminIcon name={icon} /></span></div>
        <p className='admin-metric-value' aria-label={A.noMetrics}>—</p>
        <p className='admin-description'>{A.noMetrics}</p>
      </section>)}
    </div>
    <section className='admin-registration-callout'>
      <span className='admin-icon-tile'><AdminIcon name='users' /></span>
      <div><h2>{A.startTitle}</h2><p>{A.startDescription}</p></div>
      <button type='button' className='btn' onClick={onRegister}>{A.register}</button>
    </section>
    <section className='admin-panel'>
      <div className='admin-panel-heading'><h2>{A.hubActivity}</h2></div>
      <div className='admin-empty'><p>{A.noActivity}</p><p>{A.unavailableList}</p></div>
    </section>
  </>;
}

export function AdminApp() {
  const [page, setPage] = useState<AdminPage>(() => adminPage(typeof window === 'undefined' ? '' : window.location.hash));
  const [dialog, setDialog] = useState<'registration' | 'menu' | 'help' | 'hub' | 'display' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const onHash = () => setPage(adminPage(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (page === 'login') {
      window.location.replace('/admin/login');
      return;
    }
    document.title = 'Ugatan | ' + A[page];
    document.documentElement.lang = 'en';
    heading.current?.focus();
  }, [page]);
  if (page === 'login') return <main className='p-6'><a className='admin-text-button' href='/admin/login'>{A.login}</a></main>;

  const register = () => setDialog('registration');

  return <>
    <div className='admin-shell'>
    <a className='admin-skip-link' href='#admin-main' onClick={(event) => { event.preventDefault(); document.getElementById('admin-main')?.focus(); }}>{A.skipContent}</a>
    <aside className='admin-sidebar'>
      <a href='#overview' aria-label='Ugatan'><Logo /></a>
      <p className='admin-eyebrow'>{A.workspace}</p>
      <div className='admin-hub'><AdminIcon name='hub' /><span>{A.hubTitle}<small>{A.notConfigured}</small></span></div>
      <Navigation page={page} />
      <div className='admin-sidebar-bottom'>
        <button type='button' className='admin-nav-action' onClick={() => setDialog('display')} aria-haspopup='dialog' aria-controls='admin-display'><DisplayPreferencesIcon /><span>Display preferences</span></button>
        <button type='button' className='admin-nav-action' onClick={() => setDialog('hub')}><AdminIcon name='settings' />{A.hubInfo}</button>
        <button type='button' className='admin-nav-action' onClick={() => setDialog('help')}><AdminIcon name='help' />{A.help}</button>
        <a className='admin-nav-action' href='/admin/login'>{A.login}</a>
      </div>
    </aside>
    <div className='admin-workspace'>
      <header className='admin-header'>
        <button type='button' className='admin-menu-button' onClick={() => setDialog('menu')} aria-haspopup='dialog' aria-controls='admin-menu'>{A.menu}</button>
        <p className='admin-breadcrumb'><span>{A.workspace}</span><span aria-hidden='true'>/</span><strong>{A[page]}</strong></p>
        <button type='button' className='chat-icon-button ml-auto lg:hidden' onClick={() => setDialog('help')} aria-label={A.help} title={A.help}><AdminIcon name='help' /></button>
      </header>
      <main id='admin-main' tabIndex={-1} className='admin-main'>
        <div className='admin-page-heading'>
          <div><p className='admin-eyebrow'>UGATAN ADMIN HUB</p><h1 ref={heading} tabIndex={-1}>{pageCopy[page].title}</h1><p>{pageCopy[page].description}</p></div>
          <button type='button' className='btn admin-register-button' onClick={register} aria-haspopup='dialog' aria-controls='admin-registration'><AdminIcon name='plus' />{A.register}</button>
        </div>

        {page === 'overview' ? <Overview onRegister={register} /> : page === 'activity' ? <section className='admin-panel'>
          <div className='admin-panel-heading'><h2>{A.hubActivity}</h2></div>
          <div className='admin-empty'><span className='admin-icon-tile'><AdminIcon name='activity' /></span><h3>{A.noActivity}</h3><p>{A.unavailableList}</p></div>
        </section> : <UserList qr={page === 'qr'} />}
        <footer className='admin-footer'><span>{A.adminTitle}</span><a href='/'>{A.backHome}</a></footer>
      </main>
    </div>
    </div>
    {dialog === 'registration' && <RegistrationDialog onClose={() => setDialog(null)} />}
    {dialog === 'menu' && <AdminDialog id='admin-menu' title={A.menuTitle} drawer='left' onClose={() => setDialog(null)}>
      <Navigation page={page} onSelect={() => setDialog(null)} />
      <button type='button' className='admin-nav-action' onClick={() => setDialog('display')} aria-haspopup='dialog' aria-controls='admin-display'><DisplayPreferencesIcon /><span>Display preferences</span></button>
      <button type='button' className='admin-nav-action' onClick={() => setDialog('hub')}><AdminIcon name='settings' />{A.hubInfo}</button>
      <button type='button' className='admin-nav-action' onClick={() => setDialog('help')}><AdminIcon name='help' />{A.help}</button>
      <a className='admin-nav-action' href='/admin/login' onClick={() => setDialog(null)}>{A.login}</a>
    </AdminDialog>}
    {dialog === 'display' && <AdminDialog id='admin-display' title='Display preferences' onClose={() => setDialog(null)}>
      <DisplayPreferencesPanel language='en' id='admin-display-options' />
    </AdminDialog>}
    {dialog === 'help' && <AdminDialog id='admin-help' title={A.helpTitle} onClose={() => setDialog(null)}>
      <ol className='admin-help-steps'>{A.helpSteps.map((text) => <li key={text}>{text}</li>)}</ol>
      <p className='admin-callout'>{A.helpPrivacy}</p>
    </AdminDialog>}
    {dialog === 'hub' && <AdminDialog id='admin-hub-info' title={A.hubInfo} onClose={() => setDialog(null)}>
      <p className='admin-description'>{A.hubInfoDescription}</p>
      <dl className='admin-details'>
        <div><dt>{A.hubName}</dt><dd>{A.notConfigured}</dd></div>
        <div><dt>{A.location}</dt><dd>{A.notConfigured}</dd></div>
        <div><dt>{A.qr}</dt><dd>{A.qrPolicy}</dd></div>
      </dl>
      <p className='admin-callout'>{A.actionUnavailable}</p>
    </AdminDialog>}
  </>;
}
