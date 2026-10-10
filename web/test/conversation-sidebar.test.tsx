import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../src/components/ConversationSidebar';
import { L } from '../src/config/labels';
import { sileo } from 'sileo';

const hooks = vi.hoisted(() => ({ slots: [] as any[], refs: [] as any[], index: 0, refIndex: 0, effects: [] as (() => unknown)[] }));
const storage = vi.hoisted(() => ({ list: vi.fn(), rename: vi.fn(), pin: vi.fn(), remove: vi.fn(), invalidate: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: storage.invalidate }) }));
vi.mock('../src/lib/conversations', () => ({
  listLocalConversations: storage.list, renameConversation: storage.rename, setPinned: storage.pin, deleteConversation: storage.remove,
}));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: any) => {
    const i = hooks.index++;
    if (!(i in hooks.slots)) hooks.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[i], (value: any) => { hooks.slots[i] = typeof value === 'function' ? value(hooks.slots[i]) : value; }];
  },
  useRef: (initial: any) => hooks.refs[hooks.refIndex++] ?? (hooks.refs[hooks.refIndex - 1] = { current: initial }),
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
}));
const row = { id: 'chat-1', title: 'Original chat', pinned: false, sessionId: 'session', updatedAt: '2026-10-10', createdAt: '2026-10-10' };
let rows = [row];
const deleted = vi.fn();
function find(node: ReactNode, match: (e: ReactElement) => boolean): ReactElement {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    if (match(child)) return child;
    try { return find(child.props.children, match); } catch { /* Next sibling. */ }
  }
  throw new Error('Missing control');
}
function render(open = true, desktop = true) {
  hooks.index = 0; hooks.refIndex = 0; hooks.effects = [];
  return Sidebar({ open, desktop, activeId: row.id, labels: L, onToggle: vi.fn(), onSelect: vi.fn(), onNewChat: vi.fn(), onSearch: vi.fn(), onDeleted: deleted, refreshKey: 0 } as Parameters<typeof Sidebar>[0]);
}
async function mount() {
  render();
  for (const effect of hooks.effects) effect();
  await Promise.resolve(); await Promise.resolve();
}
function menu() {
  find(render(), e => e.props['aria-label'] === (L.chatActionsLabel ?? 'Conversation menu')).props.onClick({ stopPropagation() {}, currentTarget: { focus: vi.fn(), contains: () => false } });
}
function action(label: string | undefined, oldLabel: string) {
  menu();
  return find(render(), e => e.type === 'button' && e.props.children === (label ?? oldLabel));
}
function submit() { return find(render(), e => e.type === 'form' && !!e.props.onSubmit).props.onSubmit({ preventDefault() {} }); }
beforeEach(() => {
  hooks.slots = []; hooks.refs = []; rows = [row]; vi.clearAllMocks();
  storage.list.mockImplementation(async () => rows);
  storage.rename.mockImplementation(async (_id, title) => { rows = [{ ...row, title }]; });
  storage.pin.mockImplementation(async (_id, pinned) => { rows = [{ ...row, pinned }]; });
  storage.remove.mockImplementation(async () => { rows = []; });
  vi.stubGlobal('window', { prompt: vi.fn(() => null) });
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); sileo.clear(); });
describe('quiet conversation actions', () => {
  it('opens a prefilled rename dialog instead of a browser prompt', async () => {
    await mount(); action(L.chatRenameLabel, 'Rename').props.onClick();
    expect(window.prompt).not.toHaveBeenCalled();
    expect(find(render(), e => e.type === 'input').props.value).toBe(row.title);
  });
  it('saves the trimmed name without a success toast and refreshes search', async () => {
    await mount(); const success = vi.spyOn(sileo, 'success');
    action(L.chatRenameLabel, 'Rename').props.onClick();
    find(render(), e => e.type === 'input').props.onChange({ target: { value: '  New title  ' } });
    await submit();
    expect(storage.rename).toHaveBeenCalledWith(row.id, 'New title');
    expect(renderToStaticMarkup(render())).toContain('New title');
    expect(storage.invalidate).toHaveBeenCalledWith({ queryKey: ['chat-search'] });
    expect(success).not.toHaveBeenCalled();
  });
  it('rejects blank names without saving', async () => {
    await mount(); action(L.chatRenameLabel, 'Rename').props.onClick();
    find(render(), e => e.type === 'input').props.onChange({ target: { value: '   ' } });
    await submit();
    expect(storage.rename).not.toHaveBeenCalled();
    expect(find(render(), e => e.props.role === 'alert').props.children).toBe(L.chatTitleRequired);
  });
  it('keeps a failed rename editable for retry', async () => {
    await mount(); action(L.chatRenameLabel, 'Rename').props.onClick();
    find(render(), e => e.type === 'input').props.onChange({ target: { value: 'Retry title' } });
    storage.rename.mockRejectedValueOnce(new Error('Blocked storage'));
    await submit();
    expect(find(render(), e => e.type === 'input').props.value).toBe('Retry title');
    expect(find(render(), e => e.props.role === 'alert').props.children).toBe(L.chatActionError);
    await submit();
    expect(rows[0].title).toBe('Retry title');
  });
  it('requires confirmed deletion and preserves the row on failure', async () => {
    await mount(); action(L.chatDeleteLabel, 'Delete').props.onClick();
    expect(storage.remove).not.toHaveBeenCalled();
    storage.remove.mockRejectedValueOnce(new Error('Blocked storage'));
    await submit();
    expect(deleted).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
    await submit();
    expect(deleted).toHaveBeenCalledWith(row.id);
    expect(rows).toHaveLength(0);
  });
  it('does not change pin state if persistence fails', async () => {
    await mount(); storage.pin.mockRejectedValueOnce(new Error('Blocked storage'));
    await action(L.chatPinLabel, 'Pin').props.onClick();
    expect(rows[0].pinned).toBe(false);
    expect(find(render(), e => e.props.role === 'alert').props.children).toBe(L.chatActionError);
  });
  it('does not claim a persisted pin failed when only refreshing fails', async () => {
    await mount(); storage.invalidate.mockRejectedValueOnce(new Error('Refresh failed'));
    await action(L.chatPinLabel, 'Pin').props.onClick();
    expect(rows[0].pinned).toBe(true);
    expect(find(render(), e => e.props.role === 'alert').props.children).toBe(L.chatLoadError);
  });
  it('returns focus to a surviving control after deletion', async () => {
    await mount();
    const header = find(render(), e => e.type === 'button' && e.props['aria-label'] === L.sidebarCloseLabel) as ReactElement & { ref: { current: unknown } };
    expect(header.ref).toBeTruthy();
    const focus = vi.fn(); header.ref.current = { focus };
    action(L.chatDeleteLabel, 'Delete').props.onClick(); await submit();
    expect(focus).toHaveBeenCalled();
  });
  it('does not render closed desktop controls and uses a native mobile drawer', async () => {
    await mount();
    expect(renderToStaticMarkup(render(false))).not.toContain(row.title);
    expect(find(render(true, false), e => e.type === 'dialog' && e.props.id === 'ugatan-conversation-sidebar')).toBeTruthy();
  });
});
