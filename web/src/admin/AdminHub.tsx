import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AdminApp, type AdminPage, pages as adminPages } from './AdminApp';
import { loadAdminToken } from '../config/ws';
import './admin.css';

const PAGE_SET = new Set<string>(adminPages);

/** Staff portal shell at `/admin/*` — FrontEnd AdminApp with path routes. Without a token, only login opens. */
export default function AdminHub() {
  const navigate = useNavigate();
  const { page: raw } = useParams<{ page?: string }>();
  const page = (raw && PAGE_SET.has(raw) ? raw : 'overview') as AdminPage;

  if (raw && !PAGE_SET.has(raw)) {
    return <Navigate to="/admin/overview" replace />;
  }
  if (page !== 'login' && !loadAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminApp
      page={page}
      onNavigate={(next) => navigate(next === 'login' ? '/admin/login' : `/admin/${next}`)}
    />
  );
}
