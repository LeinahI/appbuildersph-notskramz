import { useRef } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { DisplayPreferencesIcon } from '../../components/DisplayPreferencesIcon';
import { DisplayPreferencesPanel } from '../../components/DisplayPreferencesPanel';
import { LogoutConfirmDialog } from '../../components/LogoutConfirmDialog';
import { loadAdminToken, saveAdminToken } from '../../config/ws';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!loadAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

const ADMIN_LOGOUT_COPY = {
  label: 'Log out',
  title: 'Log out?',
  body: 'You will leave the admin console. Sign in again to manage users and invites.',
  confirm: 'Log out',
  cancel: 'Cancel',
} as const;

export default function AdminLayout() {
  const navigate = useNavigate();
  const displayDialog = useRef<HTMLDialogElement>(null);

  function logout() {
    saveAdminToken('');
    navigate('/admin/login');
  }

  return (
    <div className="min-h-full bg-bg text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <Link to="/admin" className="text-lg font-semibold tracking-tight text-ink no-underline">
              Ugatan Admin
            </Link>
            <Link to="/admin" className="text-muted no-underline hover:text-ink">
              Users
            </Link>
            <Link to="/admin/register" className="text-muted no-underline hover:text-ink">
              Register
            </Link>
            <Link to="/admin/audit" className="text-muted no-underline hover:text-ink">
              Audit
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="icon-btn"
              aria-label="Display preferences"
              title="Display preferences"
              aria-haspopup="dialog"
              aria-controls="admin-display"
              onClick={() => displayDialog.current?.showModal()}
            >
              <DisplayPreferencesIcon />
            </button>
            <LogoutConfirmDialog copy={ADMIN_LOGOUT_COPY} onConfirm={logout} />
          </div>
        </div>
      </header>
      <dialog ref={displayDialog} id="admin-display" className="chat-dialog" aria-labelledby="admin-display-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="admin-display-heading" className="m-0 text-xl font-bold">Display preferences</h2>
          <form method="dialog">
            <button type="submit" className="chat-icon-button" aria-label="Close display preferences" title="Close display preferences">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <path d="m6 6 12 12M6 18 18 6" />
              </svg>
            </button>
          </form>
        </div>
        <DisplayPreferencesPanel language="en" id="admin-display-options" />
      </dialog>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
