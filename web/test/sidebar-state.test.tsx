import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConversationSidebar } from '../src/components/useConversationSidebar';
const hooks = vi.hoisted(() => ({ slots: [] as any[], index: 0, effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: any) => { const i = hooks.index++; if (!(i in hooks.slots)) hooks.slots[i] = typeof initial === 'function' ? initial() : initial; return [hooks.slots[i], (value: any) => { hooks.slots[i] = typeof value === 'function' ? value(hooks.slots[i]) : value; }]; },
  useEffect: (effect: () => void) => { hooks.effects.push(effect); },
}));
let saved: string | null;
let change: () => void;
const viewport = { matches: true, addEventListener: vi.fn((_event, callback) => { change = callback; }), removeEventListener: vi.fn() };
function render() { hooks.index = 0; hooks.effects = []; return useConversationSidebar(); }
beforeEach(() => {
  hooks.slots = []; saved = null; viewport.matches = true; vi.clearAllMocks();
  vi.stubGlobal('window', { matchMedia: () => viewport });
  vi.stubGlobal('localStorage', { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } });
});
afterEach(() => vi.unstubAllGlobals());
describe('shared sidebar viewport state', () => {
  it('restores desktop preference after resize but never saves mobile drawer state', () => {
    render(); hooks.effects[0]();
    render().toggle();
    expect(saved).toBe('0');
    viewport.matches = false; change();
    expect(render()).toMatchObject({ open: false, desktop: false });
    render().toggle();
    expect(render().open).toBe(true);
    expect(saved).toBe('0');
    viewport.matches = true; change();
    expect(render()).toMatchObject({ open: false, desktop: true });
  });
  it('closes the mobile drawer on navigation and removes the resize listener', () => {
    viewport.matches = false; render(); const cleanup = hooks.effects[0]();
    render().toggle(); render().closeOnMobile();
    expect(render().open).toBe(false);
    cleanup?.();
    expect(viewport.removeEventListener).toHaveBeenCalledWith('change', change);
  });
  it('keeps toggling usable when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } });
    expect(render().open).toBe(true);
    expect(() => render().toggle()).not.toThrow();
    expect(render().open).toBe(false);
  });
});
