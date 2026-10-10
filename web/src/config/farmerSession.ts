/** Farmer QR-claim session (separate from admin JWT in `ws.ts`). */

const TOKEN_KEY = 'ugatan.farmerToken';
const USER_ID_KEY = 'ugatan.farmerUserId';
const FULL_NAME_KEY = 'ugatan.farmerFullName';
const DEVICE_ID_KEY = 'ugatan.deviceId';

export type FarmerSession = {
  token: string;
  userId: string;
  fullName: string;
};

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // private window
  }
}

/** Stable per-browser id for claim body; created once. */
export function loadOrCreateDeviceId(): string {
  let id = read(DEVICE_ID_KEY);
  if (id) return id;
  id = crypto.randomUUID();
  write(DEVICE_ID_KEY, id);
  return id;
}

export function loadFarmerSession(): FarmerSession | null {
  const token = read(TOKEN_KEY);
  const userId = read(USER_ID_KEY);
  const fullName = read(FULL_NAME_KEY);
  if (!token || !userId) return null;
  return { token, userId, fullName };
}

export function loadFarmerToken(): string {
  return loadFarmerSession()?.token ?? '';
}

export function saveFarmerSession(session: FarmerSession): void {
  write(TOKEN_KEY, session.token);
  write(USER_ID_KEY, session.userId);
  write(FULL_NAME_KEY, session.fullName);
}

export function updateFarmerSessionName(fullName: string): void {
  write(FULL_NAME_KEY, fullName.trim());
}

export function clearFarmerSession(): void {
  write(TOKEN_KEY, '');
  write(USER_ID_KEY, '');
  write(FULL_NAME_KEY, '');
}
