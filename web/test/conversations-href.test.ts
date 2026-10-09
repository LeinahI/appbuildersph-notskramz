import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatHref, saveActiveConversationId } from '../src/lib/conversations';

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chatHref', () => {
  it('builds /chat/:id when given an id', () => {
    expect(chatHref('ca3ea26f-563e-4f31-a723-880f177d4dde')).toBe(
      '/chat/ca3ea26f-563e-4f31-a723-880f177d4dde',
    );
  });

  it('uses last-active id when none is passed', () => {
    stubStorage();
    saveActiveConversationId('ad038d90-4370-4bc4-8928-ec4042383006');
    expect(chatHref()).toBe('/chat/ad038d90-4370-4bc4-8928-ec4042383006');
  });

  it('falls back to bare /chat when no id is known', () => {
    stubStorage();
    saveActiveConversationId('');
    expect(chatHref()).toBe('/chat');
  });
});
