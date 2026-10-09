import { loadClaimLink, loadDeviceId } from './ws';

/**
 * A farmer who uses the app on this phone without a `ws` account. It is not a login: nothing checks it, and nothing
 * here leaves the device. It only says this phone has been set up, so the chat opens with no server. A QR claim later
 * links the same phone to the cooperative and turns on conversation sync.
 */
export type LocalProfile = { id: string; createdAt: string };

const PROFILE_KEY = 'ugatan.localProfile';

export function loadLocalProfile(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as LocalProfile) : null;
  } catch {
    return null;
  }
}

/** Makes the profile, or returns the one already on this device. */
export function createLocalProfile(): LocalProfile {
  const existing = loadLocalProfile();
  if (existing) return existing;
  const profile: LocalProfile = { id: loadDeviceId(), createdAt: new Date().toISOString() };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // private window: the profile lasts for this visit only
  }
  return profile;
}

export function clearLocalProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // private window
  }
}

/** True when the farmer may open the chat: a claim link from `ws`, or a profile made on this phone. */
export function hasFarmerAccess(): boolean {
  return loadClaimLink() !== null || loadLocalProfile() !== null;
}
