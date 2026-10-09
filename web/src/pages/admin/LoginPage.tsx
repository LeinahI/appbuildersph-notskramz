import { Navigate } from 'react-router-dom';

/** Admin login lives on the unified `/` page. */
export default function AdminLoginRedirect() {
  return <Navigate to="/" replace />;
}
