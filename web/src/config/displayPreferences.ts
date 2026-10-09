export type DisplayPreferences = {
  textSize: 'standard' | 'large' | 'extra-large';
  textWeight: 'regular' | 'stronger';
  contrast: 'automatic' | 'high';
};
export const DISPLAY_PREFERENCES_KEY = 'ugatan.displayPreferences';
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  textSize: 'standard', textWeight: 'regular', contrast: 'automatic',
};
const defaultSnapshot = { preferences: DEFAULT_DISPLAY_PREFERENCES, storageAvailable: true };
let snapshot = defaultSnapshot;
let initialized = false;
let systemHighContrast = false;
const listeners = new Set<() => void>();

export function parseDisplayPreferences(value: string | null): DisplayPreferences {
  try {
    const data = JSON.parse(value ?? 'null');
    if (!data || data.version !== 1) return { ...DEFAULT_DISPLAY_PREFERENCES };
    return {
      textSize: ['standard', 'large', 'extra-large'].includes(data.textSize) ? data.textSize : 'standard',
      textWeight: data.textWeight === 'stronger' ? 'stronger' : 'regular',
      contrast: data.contrast === 'high' ? 'high' : 'automatic',
    };
  } catch {
    return { ...DEFAULT_DISPLAY_PREFERENCES };
  }
}
function apply() {
  if (typeof document === 'undefined') return;
  const { preferences } = snapshot;
  const root = document.documentElement.dataset;
  root.uiTextSize = preferences.textSize;
  root.uiTextWeight = preferences.textWeight;
  root.uiContrast = preferences.contrast === 'high' || systemHighContrast ? 'high' : 'standard';
}
function publish(preferences: DisplayPreferences, storageAvailable = snapshot.storageAvailable) {
  snapshot = { preferences, storageAvailable };
  apply();
  listeners.forEach((listener) => listener());
}
export function initializeDisplayPreferences() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  let preferences = { ...DEFAULT_DISPLAY_PREFERENCES };
  let storageAvailable = true;
  try { preferences = parseDisplayPreferences(window.localStorage.getItem(DISPLAY_PREFERENCES_KEY)); }
  catch { storageAvailable = false; }
  const contrast = window.matchMedia?.('(prefers-contrast: more)');
  systemHighContrast = contrast?.matches ?? false;
  contrast?.addEventListener?.('change', (event) => {
    systemHighContrast = event.matches;
    apply();
  });
  publish(preferences, storageAvailable);
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== DISPLAY_PREFERENCES_KEY) return;
    try {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
    } catch { return; }
    publish(parseDisplayPreferences(event.newValue));
  });
}
export function setDisplayPreferences(change: Partial<DisplayPreferences>) {
  const preferences = parseDisplayPreferences(JSON.stringify({ version: 1, ...snapshot.preferences, ...change }));
  let storageAvailable = true;
  try {
    window.localStorage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify({ version: 1, ...preferences }));
  } catch { storageAvailable = false; }
  publish(preferences, storageAvailable);
}
export function resetDisplayPreferences() { setDisplayPreferences(DEFAULT_DISPLAY_PREFERENCES); }
export function getDisplaySnapshot() { return snapshot; }
export function getServerDisplaySnapshot() { return defaultSnapshot; }
export function subscribeDisplayPreferences(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
