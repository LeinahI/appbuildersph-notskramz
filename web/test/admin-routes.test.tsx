import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminHub from '../src/admin/AdminHub';

vi.mock('../src/admin/AdminApp', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/admin/AdminApp')>();
  return {
    ...mod,
    AdminApp: ({ page }: { page?: string }) => createElement('div', { 'data-admin-page': page ?? '' }, 'AdminApp'),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubAdminToken(token: string) {
  const store = new Map<string, string>();
  if (token) store.set('ugatan.adminToken', token);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
}

function renderAdmin(path: string) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(Routes, null, createElement(Route, { path: '/admin/:page', element: createElement(AdminHub) })),
    ),
  );
}

describe('admin SPA routes (FrontEnd AdminApp)', () => {
  it('mounts AdminHub for /admin/overview when JWT is present', () => {
    stubAdminToken('jwt-test');
    const html = renderAdmin('/admin/overview');
    expect(html).toContain('data-admin-page="overview"');
  });

  it('does not mount overview without JWT (Navigate to login)', () => {
    stubAdminToken('');
    const html = renderAdmin('/admin/overview');
    // SSR does not follow <Navigate>; AdminApp must not render for overview.
    expect(html).not.toContain('data-admin-page="overview"');
    expect(html).not.toContain('AdminApp');
  });

  it('keeps /admin/login public without JWT', () => {
    stubAdminToken('');
    const html = renderAdmin('/admin/login');
    expect(html).toContain('data-admin-page="login"');
  });

  it('mounts AdminHub for /admin/users when JWT is present', () => {
    stubAdminToken('jwt-test');
    const html = renderAdmin('/admin/users');
    expect(html).toContain('data-admin-page="users"');
  });
});
