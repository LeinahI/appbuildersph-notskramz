import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import App from './App';
import AdminLayout, { RequireAdmin } from './pages/admin/AdminLayout';
import AdminLoginPage from './pages/admin/LoginPage';
import AuditPage from './pages/admin/AuditPage';
import RegisterPage from './pages/admin/RegisterPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import UsersPage from './pages/admin/UsersPage';
import ClaimPage from './pages/ClaimPage';
import FarmerLoginPage, { RequireFarmer } from './pages/FarmerLoginPage';
import SearchChatsPage from './pages/SearchChatsPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<FarmerLoginPage />} />
          <Route path="/magsasaka/login" element={<Navigate to="/login" replace />} />
          <Route
            path="/chat/:conversationId?"
            element={
              <RequireFarmer>
                <App />
              </RequireFarmer>
            }
          />
          <Route
            path="/search"
            element={
              <RequireFarmer>
                <SearchChatsPage />
              </RequireFarmer>
            }
          />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<UsersPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
