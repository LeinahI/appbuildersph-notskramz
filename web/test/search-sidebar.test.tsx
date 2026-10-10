import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import SearchChatsPage from '../src/pages/SearchChatsPage';
import { L } from '../src/config/labels';
const env = vi.hoisted(() => ({ navigate: vi.fn(), invalidate: vi.fn(), index: 0, slots: [] as any[] }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: any) => { const i = env.index++; if (!(i in env.slots)) env.slots[i] = typeof initial === 'function' ? initial() : initial; return [env.slots[i], (next: any) => { env.slots[i] = typeof next === 'function' ? next(env.slots[i]) : next; }]; },
  useRef: () => ({ current: null }), useEffect: () => {},
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => env.navigate }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }), useQueryClient: () => ({ invalidateQueries: env.invalidate }) }));
vi.mock('@tanstack/react-virtual', () => ({ useVirtualizer: () => ({ getVirtualItems: () => [], getTotalSize: () => 0 }) }));
vi.mock('../src/lib/conversations', () => ({ ensureActiveConversation: async () => ({ id: 'other-chat' }), saveActiveConversationId: vi.fn() }));
function render() { env.index = 0; return SearchChatsPage(); }
function sidebar() { return render().props.children[0].props.children.props; }
function find(node: ReactNode, match: (e: ReactElement) => boolean): ReactElement {
  for (const child of Children.toArray(node)) { if (!isValidElement(child)) continue; if (match(child)) return child; try { return find(child.props.children, match); } catch { /* Next sibling. */ } }
  throw new Error('Missing control');
}
beforeEach(() => { env.slots = []; vi.clearAllMocks(); vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) }); vi.stubGlobal('localStorage', { getItem: () => '1' }); });
afterEach(() => vi.unstubAllGlobals());
it('keeps search open after deletion instead of navigating to another chat', async () => {
  await sidebar().onDeleted('deleted-chat');
  expect(env.navigate).not.toHaveBeenCalled();
  expect(sidebar().refreshKey).toBe(1);
});
it('offers an accessible drawer toggle on search and closes it on selection', () => {
  expect(sidebar().open).toBe(false);
  const button = find(render(), e => e.type === 'button' && e.props['aria-controls'] === 'ugatan-conversation-sidebar');
  expect(button.props['aria-label']).toBe(L.sidebarOpenLabel);
  button.props.onClick();
  expect(sidebar().open).toBe(true);
  sidebar().onSelect({ id: 'chosen-chat' });
  expect(sidebar().open).toBe(false);
  expect(env.navigate).toHaveBeenCalledWith('/chat/chosen-chat');
});
