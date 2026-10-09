/** Build-time default for the Ugatan registration API (`ws`). */
export const DEFAULT_WS_URL: string = (import.meta.env.VITE_WS_URL ?? 'http://127.0.0.1:8080').trim().replace(/\/+$/, '');

const TOKEN_KEY = 'ugatan.adminToken';

export function loadAdminToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/** `remember` keeps the token across browser restarts; otherwise it lasts for this tab only. An empty token signs out. */
export function saveAdminToken(token: string, remember = true): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // private window
  }
}
