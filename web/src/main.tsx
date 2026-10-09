import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import App from './App';
import AdminLayout, { RequireAdmin } from './pages/admin/AdminLayout';
import AuditPage from './pages/admin/AuditPage';
import RegisterPage from './pages/admin/RegisterPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import UsersPage from './pages/admin/UsersPage';
import ClaimPage from './pages/ClaimPage';
import LoginPage, { RequireFarmer } from './pages/LoginPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/chat/:conversationId?"
          element={
            <RequireFarmer>
              <App />
            </RequireFarmer>
          }
        />
        <Route path="/claim" element={<ClaimPage />} />
        <Route path="/admin/login" element={<Navigate to="/" replace />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
