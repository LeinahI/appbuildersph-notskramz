import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { loadSetup } from './config/setup';
import SearchChatsPage from './pages/SearchChatsPage';
import SetupPage from './pages/SetupPage';
import { ToastHost } from './components/ToastHost';
import './index.css';
import './display-preferences.css';
import { initializeDisplayPreferences } from './config/displayPreferences';

initializeDisplayPreferences();

/** The Android app: no staff pages, and the setup screen until the phone is set up. */
const NATIVE = Capacitor.isNativePlatform();

const LandingPage = lazy(() => import('./pages/LandingPage'));
const ClaimPage = lazy(() => import('./pages/ClaimPage'));
const AdminHub = lazy(() => import('./admin/AdminHub'));

/**
 * Farmers never sign in: the chat opens at once and everything stays in the phone's own storage. The Android app
 * shows its setup first, until it is done. Browser `/` is the marketing landing.
 */
function startPath(): string {
  return NATIVE && !loadSetup()?.done ? '/setup' : '/chat';
}

function AdminFallback() {
  return <div className='grid min-h-dvh place-items-center text-mist'>Loading admin…</div>;
}

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
          <Route
            path="/"
            element={
              NATIVE ? (
                <Navigate to={startPath()} replace />
              ) : (
                <Suspense fallback={<div className='grid min-h-dvh place-items-center text-mist'>Loading…</div>}>
                  <LandingPage />
                </Suspense>
              )
            }
          />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/chat/:conversationId?" element={<App />} />
          <Route path="/search" element={<SearchChatsPage />} />
          {/* Old farmer sign-in and QR links open the landing (browser) or chat (native via /). */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/magsasaka/login" element={<Navigate to="/" replace />} />
          <Route
            path="/claim"
            element={
              <Suspense fallback={<div className="grid min-h-dvh place-items-center text-mist">Claiming…</div>}>
                <ClaimPage />
              </Suspense>
            }
          />
          {NATIVE ? null : (
            <>
              {/* FrontEnd AdminApp (sidebar hub UI). Old Users/Register/Audit paths redirect here. */}
              <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
              <Route path="/admin/register" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/audit" element={<Navigate to="/admin/activity" replace />} />
              <Route path="/admin/users/:id" element={<Navigate to="/admin/users" replace />} />
              <Route
                path="/admin/:page"
                element={
                  <Suspense fallback={<AdminFallback />}>
                    <AdminHub />
                  </Suspense>
                }
              />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastHost />
    </QueryClientProvider>
  </React.StrictMode>,
);
