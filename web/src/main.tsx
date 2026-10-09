import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { loadSetup } from './config/setup';
import AdminLayout, { RequireAdmin } from './pages/admin/AdminLayout';
import AdminLoginPage from './pages/admin/LoginPage';
import AuditPage from './pages/admin/AuditPage';
import RegisterPage from './pages/admin/RegisterPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import UsersPage from './pages/admin/UsersPage';
import SetupPage from './pages/SetupPage';
import './index.css';

/** The Android app: no staff pages, and the setup screen until the phone is set up. */
const NATIVE = Capacitor.isNativePlatform();

/**
 * Farmers never sign in: the chat opens at once and everything stays in the phone's own storage. The Android app
 * shows its setup first, until it is done.
 */
function startPath(): string {
  return NATIVE && !loadSetup()?.done ? '/setup' : '/chat';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={startPath()} replace />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/chat/:conversationId?" element={<App />} />
        {/* Old farmer sign-in and QR links now open the chat. */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/magsasaka/login" element={<Navigate to="/" replace />} />
        <Route path="/claim" element={<Navigate to="/" replace />} />
        {NATIVE ? null : (
          <>
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
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
