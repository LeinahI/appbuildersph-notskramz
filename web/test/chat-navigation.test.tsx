import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { HomePage } from '../src/components/HomePage';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { L } from '../src/config/labels';

const hooks = vi.hoisted(() => ({ slots: [] as any[], refs: [] as any[], index: 0, refIndex: 0, effects: [] as (() => unknown)[] }));
const env = vi.hoisted(() => ({ navigate: vi.fn(), create: vi.fn(), rename: vi.fn(), save: vi.fn(), add: vi.fn(), shrink: vi.fn(), invalidate: vi.fn(), focus: vi.fn(), reachable: vi.fn(), sync: vi.fn(), ensure: vi.fn(), resolve: vi.fn(), hubUrl: '', routeId: undefined as string | undefined }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: any) => {
    const i = hooks.index++;
    if (!(i in hooks.slots)) hooks.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[i], (value: any) => { hooks.slots[i] = typeof value === 'function' ? value(hooks.slots[i]) : value; }];
  },
  useRef: (initial: any) => hooks.refs[hooks.refIndex++] ?? (hooks.refs[hooks.refIndex - 1] = { current: initial }),
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
  useCallback: (fn: any) => fn,
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => env.navigate, useParams: () => ({ conversationId: env.routeId }), useSearchParams: () => [new URLSearchParams(), vi.fn()] }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }), useQueryClient: () => ({ invalidateQueries: env.invalidate }) }));
vi.mock('@tanstack/react-virtual', () => ({ useVirtualizer: () => ({ getVirtualItems: () => [], getTotalSize: () => 0 }) }));
vi.mock('../src/lib/conversations', () => ({
  createLocalConversation: env.create, renameConversation: env.rename, saveActiveConversationId: env.save,
  loadActiveConversationId: () => '', resolveConversation: env.resolve, questionsForConversation: async () => [],
  ensureActiveConversation: env.ensure,
}));
vi.mock('../src/lib/db', () => ({ db: { questions: { add: env.add, update: vi.fn() }, conversations: { get: async () => ({ id: 'old-chat' }) }, transaction: async (...args: any[]) => args.at(-1)() }, newId: () => 'question' }));
vi.mock('../src/lib/llm', () => ({ phoneAi: { ready: false, subscribe: () => () => {} }, phoneAiFit: () => 'ok' }));
vi.mock('../src/config/hub', () => ({ loadHubUrl: () => env.hubUrl }));
vi.mock('../src/lib/sync', () => ({ hubReachable: env.reachable, syncQueue: env.sync }));
vi.mock('../src/lib/hub-discovery', () => ({ ensureHub: async () => (await env.reachable(env.hubUrl) ? { url: env.hubUrl, caps: {} } : null) }));
vi.mock('../src/lib/photo', () => ({ shrinkPhoto: env.shrink, photoSrc: (s: string) => s }));

const old = { id: 'old-chat', title: 'Bagong usapan', pinned: false, sessionId: 'session', createdAt: '', updatedAt: '' };
function find(node: ReactNode, type: unknown): ReactElement {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    if (child.type === type) return child;
    try { return find(child.props.children, type); } catch { /* Next sibling. */ }
  }
  throw new Error('Missing component');
}
function render() { hooks.index = 0; hooks.refIndex = 0; hooks.effects = []; return App(); }
function home() { return find(render(), HomePage).props; }
function sidebar() { return render().props.children[0].props.children.props; }
function confirm() { find(render(), ConfirmDialog).props.onConfirm(); }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; }
beforeEach(() => {
  hooks.slots = []; hooks.refs = []; vi.resetAllMocks();
  env.create.mockResolvedValue(old); env.add.mockResolvedValue(1); env.rename.mockResolvedValue(undefined);
  env.invalidate.mockResolvedValue(undefined);
  env.hubUrl = ''; env.reachable.mockResolvedValue(true); env.sync.mockResolvedValue({ reachable: true, sent: 1 });
  env.ensure.mockResolvedValue(null);
  env.routeId = undefined; env.resolve.mockResolvedValue(null);
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('document', { documentElement: { lang: '' }, getElementById: () => ({ focus: env.focus }) });
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => { fn(); return 1; });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('protected chat navigation', () => {
  it('confirms before discarding typed text', () => {
    home().onTextChange('Unsent text');
    home().onNewConversation();
    expect(env.navigate).not.toHaveBeenCalled();
    expect(home().text).toBe('Unsent text');
    confirm();
    expect(home().text).toBe('');
    expect(env.navigate).toHaveBeenCalledWith('/chat');
  });
  it('focuses an empty draft without creating a saved empty chat', () => {
    home().onNewConversation();
    expect(env.create).not.toHaveBeenCalled();
    expect(env.focus).toHaveBeenCalledOnce();
  });
  it('does not navigate back when creation finishes after New Chat', async () => {
    const pending = deferred<typeof old>(); env.create.mockReturnValueOnce(pending.promise);
    home().onTextChange('May uod'); home().onSubmit();
    home().onNewConversation();
    pending.resolve(old);
    await vi.waitFor(() => expect(env.add).toHaveBeenCalled());
    expect(env.navigate.mock.calls.map(call => call[0])).toEqual(['/chat']);
    expect(sidebar().activeId).toBe('');
    expect(home().children).toBeNull();
    expect(env.add.mock.calls[0][0].conversationId).toBe(old.id);
  });
  it('does not restore an old chat when its automatic title finishes late', async () => {
    const pending = deferred<void>(); env.rename.mockReturnValueOnce(pending.promise);
    home().onTextChange('May uod'); home().onSubmit();
    await vi.waitFor(() => expect(env.rename).toHaveBeenCalled());
    home().onNewConversation(); pending.resolve();
    await Promise.resolve(); await Promise.resolve();
    expect(sidebar().activeId).toBe('');
    expect(home().children).toBeNull();
    expect(home().text).toBe('');
  });
  it('ignores a late photo result after New Chat', async () => {
    const pending = deferred<string>(); env.shrink.mockReturnValueOnce(pending.promise);
    home().onPhotoFile({} as File); home().onNewConversation(); pending.resolve('old-photo');
    await Promise.resolve(); await Promise.resolve();
    expect(home().photo).toBeNull();
  });
  it('starts with a closed drawer on a tablet even if desktop was open', () => {
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, matchMedia: (query: string) => ({ matches: !query.includes('1024') }) });
    expect(sidebar().open).toBe(false);
    expect(sidebar().desktop).toBe(false);
  });
  it('preserves newer typing when an initial save fails', async () => {
    const pending = deferred<typeof old>();
    env.create.mockReturnValueOnce(pending.promise);
    home().onTextChange('First question'); home().onSubmit();
    home().onTextChange('Newer typing');
    pending.reject(new Error('Blocked storage'));
    await vi.waitFor(() => expect(home().notice).toBeTruthy());
    expect(home().text).toContain('First question');
    expect(home().text).toContain('Newer typing');
  });
  it('does not let an old failed creation clear the newer pending chat', async () => {
    const first = deferred<typeof old>(); const second = deferred<typeof old>();
    env.create.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    home().onTextChange('Old question'); home().onSubmit(); home().onNewConversation();
    home().onTextChange('New question'); home().onSubmit();
    first.reject(new Error('Old request failed')); await Promise.resolve(); await Promise.resolve();
    home().onTextChange('Another question'); home().onSubmit();
    expect(env.create).toHaveBeenCalledTimes(2);
    second.resolve({ ...old, id: 'new-chat' });
    await vi.waitFor(() => expect(env.add).toHaveBeenCalledTimes(2));
  });
  it('does not show an old send status in a newer draft', async () => {
    env.hubUrl = 'local';
    const pending = deferred<boolean>(); env.reachable.mockReturnValueOnce(pending.promise);
    home().onTextChange('Old question'); home().onSubmit();
    await vi.waitFor(() => expect(env.reachable).toHaveBeenCalled());
    home().onNewConversation(); pending.resolve(true);
    await vi.waitFor(() => expect(env.sync).toHaveBeenCalled());
    await Promise.resolve(); await Promise.resolve();
    expect(home().notice).toBe('');
  });
  it('does not let an active deletion fallback replace a newer draft', async () => {
    home().onTextChange('May uod'); home().onSubmit();
    await vi.waitFor(() => expect(env.rename).toHaveBeenCalled());
    const pending = deferred<typeof old>(); env.ensure.mockReturnValueOnce(pending.promise);
    const deletion = sidebar().onDeleted(old.id);
    home().onNewConversation();
    pending.resolve({ ...old, id: 'fallback' }); await deletion;
    expect(sidebar().activeId).toBe('');
  });
  it('does not navigate when an inactive chat is deleted', async () => {
    home().onTextChange('May uod'); home().onSubmit();
    await vi.waitFor(() => expect(env.rename).toHaveBeenCalled()); env.navigate.mockClear();
    await sidebar().onDeleted('inactive');
    expect(env.navigate).not.toHaveBeenCalled();
    expect(sidebar().activeId).toBe(old.id);
  });
  it('does not navigate from a pending creation after leaving the page', async () => {
    render(); const cleanups = hooks.effects.map(effect => effect()).filter(fn => typeof fn === 'function') as (() => void)[];
    await Promise.resolve(); await Promise.resolve();
    const pending = deferred<typeof old>(); env.create.mockReturnValueOnce(pending.promise);
    home().onTextChange('Old question'); home().onSubmit();
    cleanups.forEach(fn => fn());
    pending.resolve(old);
    await vi.waitFor(() => expect(env.add).toHaveBeenCalled());
    expect(env.navigate).not.toHaveBeenCalled();
  });
  it('keeps text and gates sends until the intended saved chat loads', async () => {
    env.routeId = old.id;
    const pending = deferred<typeof old>(); env.resolve.mockReturnValueOnce(pending.promise);
    render(); hooks.effects.forEach(effect => effect());
    home().onTextChange('Typed while loading'); home().onSubmit();
    expect(env.create).not.toHaveBeenCalled();
    expect(home().text).toBe('Typed while loading');
    pending.resolve(old); await Promise.resolve(); await Promise.resolve();
    expect(home().text).toBe('Typed while loading');
    home().onSubmit();
    await vi.waitFor(() => expect(env.add).toHaveBeenCalled());
    expect(env.add.mock.calls[0][0].conversationId).toBe(old.id);
  });
  it('offers a retry after chat loading fails and never silently creates another chat', async () => {
    env.routeId = old.id; env.resolve.mockRejectedValueOnce(new Error('Read failed')).mockResolvedValueOnce(old);
    render(); hooks.effects.forEach(effect => effect());
    await Promise.resolve(); await Promise.resolve();
    home().onTextChange('Keep this'); home().onSubmit();
    expect(env.create).not.toHaveBeenCalled();
    expect(home().text).toBe('Keep this');
    home().tray.props.onClick();
    render(); hooks.effects.forEach(effect => effect());
    await Promise.resolve(); await Promise.resolve();
    expect(sidebar().activeId).toBe(old.id);
    expect(home().text).toBe('Keep this');
  });
  it('opens a fresh draft when fallback lookup fails after active deletion', async () => {
    home().onTextChange('May uod'); home().onSubmit();
    await vi.waitFor(() => expect(env.rename).toHaveBeenCalled());
    env.ensure.mockRejectedValueOnce(new Error('Read failed'));
    await sidebar().onDeleted(old.id);
    expect(sidebar().activeId).toBe('');
    expect(env.navigate).toHaveBeenLastCalledWith('/chat');
  });
  it('clears a failed-chat retry when starting a fresh draft', async () => {
    env.routeId = old.id; env.resolve.mockRejectedValueOnce(new Error('Read failed'));
    render(); hooks.effects.forEach(effect => effect());
    await Promise.resolve(); await Promise.resolve();
    home().onNewConversation();
    expect(home().tray).toBeUndefined();
  });
  it('preserves another chat unsaved question when resetting an empty draft', async () => {
    const pending = deferred<number>(); env.add.mockReturnValueOnce(pending.promise);
    home().onTextChange('Keep the unsaved question'); home().onSubmit();
    await vi.waitFor(() => expect(env.add).toHaveBeenCalled());
    home().onNewConversation();
    pending.reject(new Error('Storage failed'));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    home().onNewConversation();
    sidebar().onSelect(old);
    expect(home().children).not.toBeNull();
    expect(home().notice).toBe(L.saveError);
  });
});
