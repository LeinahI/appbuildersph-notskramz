/**
 * Whether this phone finished the first setup (connect to the hub's Wi-Fi, download the AI). Kept on the phone only.
 * `ai: 'ready'` means the models are in the phone's storage, so the app loads them at start with no hub.
 */
export interface SetupState {
  done: boolean;
  ai: 'ready' | 'skipped';
  /** The team's Laya threshold from the hub, kept so Laya can load later with the hub away. Null without Laya. */
  layaThreshold: number | null;
  /** The hub address the models were downloaded from: their keys in the phone's cache. */
  hubUrl: string;
  at: string;
}

const SETUP_KEY = 'ugatan.setup';

export function loadSetup(): SetupState | null {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    return raw ? (JSON.parse(raw) as SetupState) : null;
  } catch {
    return null;
  }
}

export function saveSetup(state: Omit<SetupState, 'done' | 'at'>): SetupState {
  const full: SetupState = { ...state, done: true, at: new Date().toISOString() };
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(full));
  } catch {
    // private window: setup shows again next time
  }
  return full;
}
