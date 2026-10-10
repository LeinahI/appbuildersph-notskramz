/** Hub address when nothing else is known: a hub on this same computer. */
export const DEFAULT_HUB_URL = 'http://127.0.0.1:8787';

/** The ports a hub listens on: the full hub (8787) and the phone hub (8790). */
export const HUB_PORTS: readonly number[] = [8787, 8790];

const HUB_KEY = 'ugatan.hubUrl';

const clean = (url: string) => url.trim().replace(/\/+$/, '');

/** The build-time address (VITE_HUB_URL), or null when the build set none. */
export function bakedHubUrl(): string | null {
  return clean(import.meta.env.VITE_HUB_URL ?? '') || null;
}

/**
 * The hub to talk to: the one the app found last time on the hub's Wi-Fi (see lib/hub-discovery), else the
 * build-time VITE_HUB_URL, else this computer. The farmer never types an address.
 */
export function loadHubUrl(): string {
  try {
    const saved = localStorage.getItem(HUB_KEY);
    if (saved) return clean(saved);
  } catch {
    // Storage blocked: the build-time address still works.
  }
  return bakedHubUrl() ?? DEFAULT_HUB_URL;
}

/** Remembers the hub the app found, so the next start talks to it at once. */
export function saveHubUrl(url: string): void {
  try {
    localStorage.setItem(HUB_KEY, clean(url));
  } catch {
    // Storage blocked: the app searches again next time.
  }
}
