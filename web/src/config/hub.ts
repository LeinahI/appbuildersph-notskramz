const STORAGE_KEY = 'ugatan.hubUrl';

/** Build-time default from VITE_HUB_URL. Blank means offline only. */
export const DEFAULT_HUB_URL: string = (import.meta.env.VITE_HUB_URL ?? '').trim();

/** Per-device hub address set in the app. Stored in localStorage, so it is a convenience, not shared state. */
export function loadHubUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_HUB_URL;
  } catch {
    return DEFAULT_HUB_URL;
  }
}

export function saveHubUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  } catch {
    // Storage blocked (private window). The app still works for this session.
  }
}
