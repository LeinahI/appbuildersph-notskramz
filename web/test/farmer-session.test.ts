import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const assign = vi.fn();

vi.mock('../src/lib/ws-api', () => ({
  listConversationsRemote: vi.fn(),
  createConversationRemote: vi.fn(),
  deleteConversationRemote: vi.fn(),
  patchConversationRemote: vi.fn(),
  putConversationMessages: vi.fn(),
}));

import { clearLocalProfile, createLocalProfile, hasFarmerAccess, loadLocalProfile } from '../src/config/profile';
import { clearClaimLink, loadClaimLink, saveClaimLink } from '../src/config/ws';
import { pullRemoteConversations } from '../src/lib/conversations';
import { listConversationsRemote } from '../src/lib/ws-api';

describe('farmer login without a server session', () => {
  beforeEach(() => {
    store.clear();
    assign.mockClear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    vi.stubGlobal('window', { location: { assign } });
    saveClaimLink({ userId: 'user-1', token: 'jwt' });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the farmer signed in when the server rejects the token', async () => {
    vi.mocked(listConversationsRemote).mockRejectedValue({ status: 401 });
    await pullRemoteConversations();
    expect(loadClaimLink()).toEqual({ userId: 'user-1', token: 'jwt' });
    expect(assign).not.toHaveBeenCalled();
  });

  it('keeps the farmer signed in when the server is unreachable', async () => {
    vi.mocked(listConversationsRemote).mockRejectedValue(new TypeError('Failed to fetch'));
    await pullRemoteConversations();
    expect(loadClaimLink()).not.toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('farmer on this phone with no account', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('opens the chat with a profile made on the phone, and no server', () => {
    expect(hasFarmerAccess()).toBe(false);
    const profile = createLocalProfile();
    expect(hasFarmerAccess()).toBe(true);
    expect(loadLocalProfile()).toEqual(profile);
  });

  it('keeps the same profile when set up twice', () => {
    expect(createLocalProfile()).toEqual(createLocalProfile());
  });

  it('still opens the chat with only a claim link', () => {
    saveClaimLink({ userId: 'user-1', token: 'jwt' });
    expect(hasFarmerAccess()).toBe(true);
    clearClaimLink();
    expect(hasFarmerAccess()).toBe(false);
  });

  it('closes the chat once the profile is cleared', () => {
    createLocalProfile();
    clearLocalProfile();
    expect(hasFarmerAccess()).toBe(false);
  });
});
