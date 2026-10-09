import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { setDisplayPreferences, resetDisplayPreferences } from '../src/config/displayPreferences';
import { AnswerView } from '../src/components/AnswerView';
import { KNOWLEDGE } from '../src/config/knowledge';
import type { QueuedQuestion } from '../src/lib/db';
import { sileo } from 'sileo';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], index: 0 }));
const storage = vi.hoisted(() => ({
  add: vi.fn(), get: vi.fn(), recent: vi.fn(), newId: vi.fn(),
}));

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: () => {},
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => {
    const index = hooks.index++;
    return hooks.slots[index] ??= { current: initial };
  },
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) {
      hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    }
    return [hooks.slots[index], (value: unknown) => {
      hooks.slots[index] = typeof value === 'function' ? value(hooks.slots[index]) : value;
    }];
  },
}));
vi.mock('../src/config/hub', () => ({ loadHubUrl: () => '' }));
vi.mock('../src/lib/llm', () => ({ phoneAi: { ready: false } }));
vi.mock('../src/lib/db', () => ({
  newId: storage.newId,
  db: { questions: {
    add: storage.add, get: storage.get,
    orderBy: () => ({ reverse: () => ({ limit: () => ({ toArray: storage.recent }) }) }),
  } },
}));

const saved: QueuedQuestion = {
  id: 7, uid: 'saved-question', crop: 'any', text: 'Saved crop question',
  createdAt: '2026-10-09T08:00:00.000Z', status: 'answered',
  matchIds: [KNOWLEDGE[0].id, 'removed-entry'], clear: true,
  explanation: 'Saved explanation', explanationStatus: 'phone',
};

function renderApp() {
  hooks.index = 0;
  const [home, , dialog] = App().props.children as ReactElement[];
  return { home, dialog };
}

function find(node: ReactNode, type: unknown): ReactElement | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    if (child.type === type) return child;
    const found = find(child.props.children, type);
    if (found) return found;
  }
}

beforeEach(() => {
  hooks.slots = [];
  storage.add.mockReset().mockResolvedValue(8);
  storage.get.mockReset().mockResolvedValue(saved);
  storage.recent.mockReset().mockResolvedValue([saved]);
  storage.newId.mockReset().mockReturnValue('new-question');
  vi.stubGlobal('requestAnimationFrame', vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); sileo.clear(); });

describe('new and saved conversation actions', () => {
  it('shows a toast for photo input without changing the draft or submitting', () => {
    const info = vi.spyOn(sileo, 'info');
    renderApp().home.props.onTextChange('Unsent question');
    renderApp().home.props.onPhoto();
    expect(info).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Larawan', description: expect.stringContaining('Ilarawan muna'),
    }));
    expect(renderApp().home.props.text).toBe('Unsent question');
    expect(renderApp().home.props.notice).toBe('');
    expect(storage.add).not.toHaveBeenCalled();
    info.mockRestore();
    sileo.clear();
  });

  it('keeps voice listening inline and shows a toast for unavailable voice input', () => {
    const error = vi.spyOn(sileo, 'error');
    const { home } = renderApp();
    home.props.onNotice('Nakikinig… Magsalita tungkol sa iyong pananim.');
    expect(renderApp().home.props.notice).toContain('Nakikinig');
    expect(error).not.toHaveBeenCalled();
    home.props.onNotice('Hindi magamit ang mikropono. Suriin ang pahintulot o i-type ang iyong tanong.');
    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('Hindi magamit ang mikropono'),
    }));
    expect(renderApp().home.props.notice).toBe('');
    error.mockRestore();
    sileo.clear();
  });

  it('reopens the saved answer without another submission or model request', () => {
    renderApp().dialog.props.onSelect(saved);
    const { home } = renderApp();
    const answer = find(home.props.children, AnswerView);
    expect(answer?.props.matches).toEqual([KNOWLEDGE[0]]);
    expect(answer?.props.explanation).toBe(saved.explanation);
    expect(answer?.props.explanationStatus).toBe('phone');
    expect(storage.add).not.toHaveBeenCalled();
  });

  it('starts a clean chat from inside the dialog without deleting history', () => {
    const initial = renderApp();
    initial.dialog.props.onSelect(saved);
    initial.home.props.onTextChange('Unsent draft');
    initial.home.props.onNotice('Old notice');
    const close = vi.fn();
    const ref = (initial.dialog as ReactElement & { ref: { current: unknown } }).ref;
    ref.current = { close };
    const key = renderApp().home.key;
    renderApp().dialog.props.onNewConversation();
    const { home } = renderApp();
    expect(home.props.children).toBeNull();
    expect(home.props.text).toBe('');
    expect(home.props.notice).toBe('');
    expect(home.key).not.toBe(key);
    expect(close).toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalled();
    expect(storage.add).not.toHaveBeenCalled();
  });

  it('opens the chat dialog from the home new-chat button without clearing the current chat or draft', async () => {
    const initial = renderApp();
    initial.dialog.props.onSelect(saved);
    renderApp().home.props.onTextChange('Unsent draft');
    const showModal = vi.fn();
    const ref = (initial.dialog as ReactElement & { ref: { current: unknown } }).ref;
    ref.current = { showModal, close: vi.fn() };
    const before = renderApp().home;
    before.props.onNewConversation();
    expect(showModal).toHaveBeenCalledOnce();
    expect(renderApp().home.props.text).toBe('Unsent draft');
    expect(renderApp().home.props.children).not.toBeNull();
    expect(renderApp().home.key).toBe(before.key);
    await vi.waitFor(() => expect(storage.recent).toHaveBeenCalled());
    expect(storage.add).not.toHaveBeenCalled();
  });

  it('does not attach a pending submission to a different saved conversation', async () => {
    let finishSave!: (id: number) => void;
    storage.add.mockReturnValue(new Promise<number>((resolve) => { finishSave = resolve; }));
    renderApp().home.props.onTextChange('Bakit naninilaw ang dahon?');
    renderApp().home.props.onSubmit();
    renderApp().dialog.props.onSelect(saved);
    finishSave(8);
    await vi.waitFor(() => expect(storage.recent).toHaveBeenCalled());
    const { home } = renderApp();
    expect(find(home.props.children, AnswerView)?.props.explanation).toBe(saved.explanation);
    expect(home.props.children.props.children[1].props.children).toBe(saved.text);
    expect(storage.get).not.toHaveBeenCalled();
    home.props.onHistory();
    await vi.waitFor(() => expect(storage.get).toHaveBeenCalledWith(saved.id));
    expect(storage.get).not.toHaveBeenCalledWith(8);
  });

  it('ignores a stale answer refresh after selecting another saved question', async () => {
    let finishRead!: (record: QueuedQuestion) => void;
    storage.get.mockReturnValue(new Promise<QueuedQuestion>((resolve) => { finishRead = resolve; }));
    renderApp().dialog.props.onSelect(saved);
    renderApp().home.props.onHistory();
    await vi.waitFor(() => expect(storage.get).toHaveBeenCalledWith(saved.id));
    const other = { ...saved, id: 9, uid: 'other-question', explanation: 'Other explanation' };
    renderApp().dialog.props.onSelect(other);
    finishRead(saved);
    await Promise.resolve();
    expect(find(renderApp().home.props.children, AnswerView)?.props.explanation).toBe(other.explanation);
  });
});

describe('display preferences do not reset chat state', () => {
  it('preserves a saved answer, unsent text and the component key', () => {
    vi.stubGlobal('document', { documentElement: { dataset: {} } });
    vi.stubGlobal('window', { localStorage: { setItem: vi.fn() } });
    renderApp().dialog.props.onSelect(saved);
    renderApp().home.props.onTextChange('Unsent question');
    const before = renderApp().home;
    setDisplayPreferences({ textSize: 'extra-large', textWeight: 'stronger', contrast: 'high' });
    const after = renderApp().home;
    expect(after.key).toBe(before.key);
    expect(after.props.text).toBe('Unsent question');
    expect(find(after.props.children, AnswerView)?.props.explanation).toBe(saved.explanation);
    expect(storage.add).not.toHaveBeenCalled();
    resetDisplayPreferences();
  });
});
