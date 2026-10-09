/** Build-time default for the Ugatan registration API (`ws`). */
export const DEFAULT_WS_URL: string = (import.meta.env.VITE_WS_URL ?? 'http://127.0.0.1:8080').trim().replace(/\/+$/, '');

const TOKEN_KEY = 'ugatan.adminToken';
const CLAIM_KEY = 'ugatan.claim';
const DEVICE_KEY = 'ugatan.deviceId';

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

export function loadDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `ephemeral-${Date.now()}`;
  }
}

export type ClaimLink = { userId: string; token: string };

export function loadClaimLink(): ClaimLink | null {
  try {
    const raw = localStorage.getItem(CLAIM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ClaimLink;
  } catch {
    return null;
  }
}

/** The link is kept on this device until the farmer logs out. The server is not asked again to keep the chat open. */
export function saveClaimLink(link: ClaimLink): void {
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify(link));
  } catch {
    // private window
  }
}

export function clearClaimLink(): void {
  try {
    localStorage.removeItem(CLAIM_KEY);
  } catch {
    // private window
  }
}

export function loadFarmerToken(): string {
  return loadClaimLink()?.token ?? '';
}
