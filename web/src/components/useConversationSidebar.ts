import { useEffect, useState } from 'react';

const KEY = 'ugatan.sidebarOpen';
const VIEWPORT = '(min-width: 1024px)';
function isDesktop() { return typeof window === 'undefined' || !window.matchMedia || window.matchMedia(VIEWPORT).matches; }
function savedDesktopOpen() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}

export function useConversationSidebar() {
  const [desktop, setDesktop] = useState(isDesktop);
  const [open, setOpen] = useState(() => isDesktop() && savedDesktopOpen());
  useEffect(() => {
    if (!window.matchMedia) return;
    const viewport = window.matchMedia(VIEWPORT);
    const change = () => { setDesktop(viewport.matches); setOpen(viewport.matches && savedDesktopOpen()); };
    viewport.addEventListener('change', change);
    return () => viewport.removeEventListener('change', change);
  }, []);
  function toggle() {
    setOpen(current => {
      const next = !current;
      if (desktop) {
        try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* Keep this visit usable without storage. */ }
      }
      return next;
    });
  }
  function closeOnMobile() { if (!desktop) setOpen(false); }
  return { desktop, open, toggle, closeOnMobile };
}
