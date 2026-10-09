import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ToastHost } from '../src/components/ToastHost';
import { resetDisplayPreferences, setDisplayPreferences } from '../src/config/displayPreferences';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], index: 0, effect: undefined as (() => (() => void)) | undefined }));
const portal = vi.hoisted(() => vi.fn((children: unknown, _container: unknown) => children));
vi.mock('react-dom', () => ({ createPortal: portal }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  useEffect: (effect: () => (() => void)) => { hooks.effect = effect; },
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = value; }];
  },
}));
function render() { hooks.index = 0; ToastHost(); return portal.mock.calls.at(-1)?.[0] as { props: Record<string, any> }; }
let modal: unknown;
let mutation: () => void;
const disconnect = vi.fn();
let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
const body = {};

beforeEach(() => {
  hooks.slots = []; hooks.index = 0; portal.mockClear(); modal = undefined; disconnect.mockClear();
  media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('document', { documentElement: { dataset: {} }, body, querySelectorAll: () => modal ? [modal] : [] });
  vi.stubGlobal('window', { localStorage: { setItem: vi.fn() }, matchMedia: () => media });
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { mutation = callback; }
    observe() {}
    disconnect = disconnect;
  });
  resetDisplayPreferences();
});
afterEach(() => vi.unstubAllGlobals());

describe('toast host boundaries', () => {
  it('follows modal opening and closing and releases observers', () => {
    render(); const cleanup = hooks.effect!(); render();
    expect(portal.mock.calls.at(-1)?.[1]).toBe(body);
    modal = {}; mutation(); render();
    expect(portal.mock.calls.at(-1)?.[1]).toBe(modal);
    modal = undefined; mutation(); render();
    expect(portal.mock.calls.at(-1)?.[1]).toBe(body);
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(media.removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('adapts a visible toast when text size or contrast changes', () => {
    render(); hooks.effect!();
    expect(render().props['data-simple']).toBe(false);
    setDisplayPreferences({ textSize: 'extra-large', textWeight: 'stronger' });
    expect(render().props['data-simple']).toBe(true);
    resetDisplayPreferences(); setDisplayPreferences({ contrast: 'high' });
    expect(render().props['data-simple']).toBe(true);
  });

  it('uses the accessible layout on narrow screens or system accessibility changes', () => {
    render(); hooks.effect!(); media.matches = true;
    media.addEventListener.mock.calls[0][1]();
    const view = render();
    expect(view.props['data-simple']).toBe(true);
    expect(view.props.children.props.position).toBe('top-center');
  });

  it('lets Space activate dismissal without hijacking unrelated keys', () => {
    render(); hooks.effect!(); const view = render();
    const click = vi.fn(); const preventDefault = vi.fn();
    const target = { closest: () => ({ click }) };
    view.props.onKeyDown({ key: ' ', target, preventDefault });
    expect(click).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    view.props.onKeyDown({ key: 'Enter', target, preventDefault });
    expect(click).toHaveBeenCalledOnce();
  });
});
