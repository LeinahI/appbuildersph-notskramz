/** Fixed hub address — no manual settings. Trailing slash stripped for fetch paths. */
export const DEFAULT_HUB_URL = 'http://127.0.0.1:8787';

/** Hub URL used by chat sync. Build-time VITE_HUB_URL overrides when set. */
export function loadHubUrl(): string {
  const fromEnv = (import.meta.env.VITE_HUB_URL ?? '').trim().replace(/\/+$/, '');
  return fromEnv || DEFAULT_HUB_URL;
}
