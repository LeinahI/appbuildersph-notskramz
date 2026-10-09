import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { sileo, Toaster } from 'sileo';
import { getDisplaySnapshot, getServerDisplaySnapshot, subscribeDisplayPreferences } from '../config/displayPreferences';
import '../toast.css';

export function notify({ title, description, type = 'info', language = 'tl' }: {
  title: string;
  description: string;
  type?: 'info' | 'success' | 'error';
  language?: 'tl' | 'en';
}) {
  const duration = type === 'error' ? null : type === 'success' ? 3000 : 5000;
  const id = sileo[type]({
    title, description, duration,
    fill: 'var(--color-paper)',
    autopilot: { expand: 1, collapse: duration ?? 10000 },
    button: { title: language === 'tl' ? 'Isara' : 'Close', onClick: () => sileo.dismiss(id) },
  });
  return id;
}

export function ToastHost() {
  const { preferences } = useSyncExternalStore(subscribeDisplayPreferences, getDisplaySnapshot, getServerDisplaySnapshot);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [mobile, setMobile] = useState(false);
  const [simple, setSimple] = useState(false);

  useEffect(() => {
    // Native modal dialogs make notifications outside the dialog inert.
    const updateContainer = () => setContainer([...document.querySelectorAll<HTMLElement>('dialog:modal')].at(-1) ?? document.body);
    const narrow = window.matchMedia('(max-width: 767px)');
    const accessible = window.matchMedia('(max-width: 399px), (prefers-reduced-motion: reduce), (forced-colors: active), (prefers-contrast: more)');
    const updateMedia = () => { setMobile(narrow.matches); setSimple(accessible.matches); };
    updateContainer();
    updateMedia();
    const observer = new MutationObserver(updateContainer);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    narrow.addEventListener('change', updateMedia);
    accessible.addEventListener('change', updateMedia);
    return () => {
      observer.disconnect();
      narrow.removeEventListener('change', updateMedia);
      accessible.removeEventListener('change', updateMedia);
    };
  }, []);

  function activateClose(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== ' ') return;
    const action = (event.target as HTMLElement).closest<HTMLElement>('[data-sileo-button]');
    if (action) { event.preventDefault(); action.click(); }
  }

  return container && createPortal(
    <div className='ugatan-toasts' data-simple={simple || preferences.textSize !== 'standard' || preferences.contrast === 'high'} onKeyDown={activateClose}>
      <Toaster position={mobile ? 'top-center' : 'top-right'} offset={{ top: 'calc(16px + env(safe-area-inset-top))', right: 16 }} />
    </div>, container,
  );
}
