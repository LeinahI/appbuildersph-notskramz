import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConversationSidebar from '../src/components/ConversationSidebar';
import { L } from '../src/config/labels';
import { saveFarmerSession } from '../src/config/farmerSession';

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: async () => undefined }) }));

vi.mock('../src/lib/conversations', () => ({
  listLocalConversations: async () => [],
  deleteConversation: async () => undefined,
  renameConversation: async () => undefined,
  setPinned: async () => undefined,
}));

vi.mock('../src/lib/ws-api', () => ({
  farmerMe: async () => ({ id: 'u1', fullName: 'Ana Reyes', status: 'active' }),
  updateFarmerName: async (fullName: string) => ({ id: 'u1', fullName, status: 'active' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubStorage(seed?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(seed ?? {}));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
}

describe('ConversationSidebar farmer footer', () => {
  it('shows Walang account when there is no farmer session', () => {
    stubStorage();
    const html = renderToStaticMarkup(
      createElement(ConversationSidebar, {
        open: true,
        desktop: true,
        activeId: '',
        labels: L,
        onToggle: () => undefined,
        onSelect: () => undefined,
        onNewChat: () => undefined,
        onSearch: () => undefined,
        onDeleted: () => undefined,
        refreshKey: 0,
      }),
    );
    expect(html).toContain(L.profileNoAccount);
  });

  it('shows the farmer fullName when a session is set', () => {
    stubStorage();
    saveFarmerSession({ token: 't', userId: 'u', fullName: 'Ana Reyes' });
    const html = renderToStaticMarkup(
      createElement(ConversationSidebar, {
        open: true,
        desktop: true,
        activeId: '',
        labels: L,
        onToggle: () => undefined,
        onSelect: () => undefined,
        onNewChat: () => undefined,
        onSearch: () => undefined,
        onDeleted: () => undefined,
        refreshKey: 0,
      }),
    );
    expect(html).toContain('Ana Reyes');
    expect(html).not.toContain(L.profileNoAccount);
  });
});
