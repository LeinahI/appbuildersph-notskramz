import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { loadAdminToken, saveAdminToken } from '../../config/ws';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!loadAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

export default function AdminLayout() {
  const navigate = useNavigate();

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
          <button type="button" className="pill-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
