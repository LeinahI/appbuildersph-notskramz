import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Conv = {
  id: string;
  remoteId?: string;
  title: string;
  pinned: boolean;
  sessionId: string;
  updatedAt: string;
  createdAt: string;
};

type Q = {
  id?: number;
  uid: string;
  text: string;
  conversationId?: string;
  explanation?: string | null;
  matchIds?: string[];
  clear?: boolean;
  hubMatchIds?: string[];
  hubClear?: boolean;
  route?: string;
};

const convs = new Map<string, Conv>();
const questions: Q[] = [];
let nextQId = 1;

vi.mock('../src/lib/db', () => ({
  db: {
    conversations: {
      get: async (id: string) => convs.get(id),
      add: async (row: Conv) => {
        convs.set(row.id, row);
      },
      update: async (id: string, patch: Partial<Conv>) => {
        const cur = convs.get(id);
        if (cur) convs.set(id, { ...cur, ...patch });
      },
      toArray: async () => [...convs.values()],
    },
    questions: {
      where: (field: string) => ({
        equals: (value: string) => ({
          sortBy: async (_key: string) =>
            questions.filter((q) => (q as Record<string, unknown>)[field] === value),
          delete: async () => {
            for (let i = questions.length - 1; i >= 0; i--) {
              if ((questions[i] as Record<string, unknown>)[field] === value) questions.splice(i, 1);
            }
          },
        }),
      }),
      add: async (row: Q) => {
        const id = nextQId++;
        questions.push({ ...row, id });
        return id;
      },
    },
  },
  newId: () => 'session-test',
}));

import {
  createLocalConversation,
  ensureActiveConversation,
  resolveConversation,
  saveActiveConversationId,
} from '../src/lib/conversations';

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

beforeEach(() => {
  convs.clear();
  questions.length = 0;
  nextQId = 1;
  stubStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deferred conversation create', () => {
  it('createLocalConversation stores the chat on the phone only', async () => {
    const row = await createLocalConversation('Bagong usapan');
    expect(row.id).toBeTruthy();
    expect(convs.has(row.id)).toBe(true);
  });

  it('ensureActiveConversation returns null when there are no local chats', async () => {
    expect(await ensureActiveConversation()).toBeNull();
    expect(convs.size).toBe(0);
  });

  it('resolveConversation returns null for bare draft when store is empty', async () => {
    expect(await resolveConversation(undefined)).toBeNull();
    expect(await resolveConversation('missing-id')).toBeNull();
    expect(convs.size).toBe(0);
  });

  it('resolveConversation(undefined) returns null even when local chats exist', async () => {
    const row = await createLocalConversation('May uod');
    saveActiveConversationId(row.id);
    expect(await resolveConversation(undefined)).toBeNull();
    expect(await resolveConversation('')).toBeNull();
    expect(convs.has(row.id)).toBe(true);
  });

  it('resolveConversation returns an existing chat by id', async () => {
    const row = await createLocalConversation('May uod');
    const found = await resolveConversation(row.id);
    expect(found?.id).toBe(row.id);
  });

  it('ensureActiveConversation reuses last-active when present', async () => {
    const row = await createLocalConversation('May uod');
    saveActiveConversationId(row.id);
    const found = await ensureActiveConversation();
    expect(found?.id).toBe(row.id);
  });
});
