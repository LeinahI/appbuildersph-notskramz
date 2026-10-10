import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClaimPage from '../src/pages/ClaimPage';
import { clearFarmerSession, loadFarmerSession, saveFarmerSession } from '../src/config/farmerSession';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  vi.stubGlobal('localStorage', storage);
  return store;
}

describe('ClaimPage', () => {
  it('shows an error when the invite token is missing', () => {
    stubStorage();
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/claim'] },
        createElement(Routes, null, createElement(Route, { path: '/claim', element: createElement(ClaimPage) })),
      ),
    );
    expect(html).toContain('Walang claim token');
    expect(html).toContain('href="/chat"');
  });

  it('shows claiming state when a token is present (before fetch settles)', () => {
    stubStorage();
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/claim?token=abc'] },
        createElement(Routes, null, createElement(Route, { path: '/claim', element: createElement(ClaimPage) })),
      ),
    );
    expect(html).toContain('Kinaklaim ang invite');
  });
});

describe('farmer session after claim', () => {
  it('persists claim fields so chat can show the name', () => {
    stubStorage();
    saveFarmerSession({ token: 't1', userId: 'u1', fullName: 'Juan Dela Cruz' });
    expect(loadFarmerSession()).toEqual({
      token: 't1',
      userId: 'u1',
      fullName: 'Juan Dela Cruz',
    });
    clearFarmerSession();
    expect(loadFarmerSession()).toBeNull();
  });
});

describe('claimInvite API', () => {
  it('POSTs without admin auth and returns fullName', async () => {
    stubStorage();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: { userId: 'u1', token: 'ft', fullName: 'Maria', status: 'active' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { claimInvite } = await import('../src/lib/ws-api');
    const res = await claimInvite({ token: 'inv', deviceId: 'd1' });
    expect(res.fullName).toBe('Maria');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/api/v1/invites/claim');
    expect(init).toMatchObject({ method: 'POST' });
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBeNull();
  });
});
