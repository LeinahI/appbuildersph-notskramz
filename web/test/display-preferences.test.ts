import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saved = new Map<string, string>();
let events: Record<string, (event: any) => void>;
let contrastChange: (event: { matches: boolean }) => void;
let matches: boolean;
beforeEach(() => {
  vi.resetModules(); saved.clear(); events = {}; matches = false;
  vi.stubGlobal('document', { documentElement: { dataset: {} } });
  vi.stubGlobal('window', {
    localStorage: { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) },
    addEventListener: (name: string, handler: (event: any) => void) => { events[name] = handler; },
    matchMedia: () => ({ matches, addEventListener: (_: string, handler: typeof contrastChange) => { contrastChange = handler; } }),
  });
});
afterEach(() => vi.unstubAllGlobals());
async function store() { return import('../src/config/displayPreferences'); }

describe('device-local display preferences', () => {
  it('uses safe defaults for invalid or unknown saved settings', async () => {
    const s = await store();
    for (const value of [null, '{}', 'bad JSON', 'null', '{"version":9,"textSize":"large"}']) {
      expect(s.parseDisplayPreferences(value)).toEqual(s.DEFAULT_DISPLAY_PREFERENCES);
    }
    expect(s.parseDisplayPreferences('{"version":1,"textSize":"large","textWeight":"invalid","contrast":"high","name":"private"}'))
      .toEqual({ textSize: 'large', textWeight: 'regular', contrast: 'high' });
  });
  it('restores and applies settings before rendering, then notifies without remounting consumers', async () => {
    const s = await store();
    saved.set(s.DISPLAY_PREFERENCES_KEY, JSON.stringify({ version: 1, textSize: 'large', textWeight: 'stronger', contrast: 'high' }));
    s.initializeDisplayPreferences();
    expect(document.documentElement.dataset).toMatchObject({ uiTextSize: 'large', uiTextWeight: 'stronger', uiContrast: 'high' });
    const notify = vi.fn(); const unsubscribe = s.subscribeDisplayPreferences(notify);
    s.setDisplayPreferences({ textSize: 'extra-large' });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(s.getDisplaySnapshot()).toBe(s.getDisplaySnapshot());
    expect(JSON.parse(saved.get(s.DISPLAY_PREFERENCES_KEY)!)).toEqual({ version: 1, textSize: 'extra-large', textWeight: 'stronger', contrast: 'high' });
    unsubscribe(); s.resetDisplayPreferences(); expect(notify).toHaveBeenCalledTimes(1);
  });
  it('updates from another tab, ignores unrelated settings and resets only its own key', async () => {
    const s = await store(); s.initializeDisplayPreferences();
    saved.set('unrelated', 'keep');
    events.storage({ key: s.DISPLAY_PREFERENCES_KEY, newValue: '{"version":1,"textSize":"large"}' });
    expect(s.getDisplaySnapshot().preferences.textSize).toBe('large');
    events.storage({ key: 'unrelated', newValue: null });
    expect(s.getDisplaySnapshot().preferences.textSize).toBe('large');
    s.resetDisplayPreferences();
    expect(s.getDisplaySnapshot().preferences).toEqual(s.DEFAULT_DISPLAY_PREFERENCES);
    expect(saved.get('unrelated')).toBe('keep');
    events.storage({ key: null, newValue: null });
    expect(document.documentElement.dataset.uiTextSize).toBe('standard');
  });
  it('follows system contrast only when automatic is selected', async () => {
    matches = true;
    const s = await store(); s.initializeDisplayPreferences();
    expect(document.documentElement.dataset.uiContrast).toBe('high');
    contrastChange({ matches: false }); expect(document.documentElement.dataset.uiContrast).toBe('standard');
    s.setDisplayPreferences({ contrast: 'high' });
    contrastChange({ matches: false }); expect(document.documentElement.dataset.uiContrast).toBe('high');
    s.setDisplayPreferences({ contrast: 'automatic' }); expect(document.documentElement.dataset.uiContrast).toBe('standard');
  });
  it('keeps changes usable in memory when browser storage is blocked', async () => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
    const s = await store(); s.initializeDisplayPreferences();
    s.setDisplayPreferences({ textSize: 'extra-large' });
    expect(s.getDisplaySnapshot()).toMatchObject({ storageAvailable: false, preferences: { textSize: 'extra-large' } });
    expect(document.documentElement.dataset.uiTextSize).toBe('extra-large');
  });
  it('reports a failed save without reverting the chosen appearance', async () => {
    const s = await store(); s.initializeDisplayPreferences();
    window.localStorage.setItem = () => { throw new Error('full'); };
    s.setDisplayPreferences({ textWeight: 'stronger' });
    expect(s.getDisplaySnapshot().storageAvailable).toBe(false);
    expect(document.documentElement.dataset.uiTextWeight).toBe('stronger');
  });
});
