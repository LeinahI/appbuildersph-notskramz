import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplayPreferencesDisclosure, DisplayPreferencesPanel } from '../src/components/DisplayPreferencesPanel';
import { getDisplaySnapshot, resetDisplayPreferences } from '../src/config/displayPreferences';
import { sileo } from 'sileo';
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}));
function find(node: ReactNode, matches: (element: ReactElement) => boolean): ReactElement {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    if (matches(child)) return child;
    try { return find(child.props.children, matches); } catch { /* Next sibling. */ }
  }
  throw new Error('Missing control');
}
beforeEach(() => {
  vi.stubGlobal('document', { documentElement: { dataset: {} } });
  vi.stubGlobal('window', { localStorage: { setItem: vi.fn() } });
  resetDisplayPreferences();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); sileo.clear(); });
describe('shared display controls', () => {
  it.each(['en', 'tl'] as const)('labels radio groups and reset in %s', (language) => {
    const html = renderToStaticMarkup(<DisplayPreferencesDisclosure language={language} id='test' />);
    expect(html).toContain('<details');
    expect((html.match(/<fieldset/g) ?? []).length).toBe(3);
    expect((html.match(/type="radio"/g) ?? []).length).toBe(7);
    expect(html).toContain(language === 'en' ? 'Reset to defaults' : 'Ibalik sa karaniwan');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Save changes');
    expect(html).not.toContain('display-description');
    expect(html).not.toContain('display-preview');
  });
  it('keeps the warning when preferences cannot be saved', () => {
    vi.mocked(window.localStorage.setItem).mockImplementation(() => { throw new Error('Storage blocked'); });
    resetDisplayPreferences();
    const html = renderToStaticMarkup(<DisplayPreferencesPanel language='en' id='test' />);
    expect(html).toMatch(/role=.status./);
    expect(html).toContain('cannot be saved in this browser');
  });
  it('applies choices immediately and resets through the same controls', () => {
    const success = vi.spyOn(sileo, 'success');
    const view = DisplayPreferencesPanel({ language: 'en', id: 'test' });
    find(view, (element) => element.type === 'input' && element.props.value === 'extra-large').props.onChange();
    expect(getDisplaySnapshot().preferences.textSize).toBe('extra-large');
    const updated = DisplayPreferencesPanel({ language: 'en', id: 'test' });
    expect(find(updated, (element) => element.props.value === 'extra-large').props.checked).toBe(true);
    find(updated, (element) => element.type === 'button').props.onClick();
    expect(getDisplaySnapshot().preferences.textSize).toBe('standard');
    expect(success).toHaveBeenCalledWith(expect.objectContaining({ title: 'Display settings reset' }));
  });
});
