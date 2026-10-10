import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminHub from '../src/admin/AdminHub';
import * as ws from '../src/config/ws';

vi.mock('../src/admin/AdminApp', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/admin/AdminApp')>();
  return {
    ...mod,
    AdminApp: ({ page }: { page?: string }) => createElement('div', { 'data-admin-page': page ?? '' }, 'AdminApp'),
  };
});

function render(path: string): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        Routes,
        null,
        createElement(Route, { path: '/admin/:page', element: createElement(AdminHub) }),
      ),
    ),
  );
}

afterEach(() => vi.restoreAllMocks());

describe('admin SPA routes (FrontEnd AdminApp)', () => {
  it.each(['overview', 'users', 'qr', 'activity'])('mounts AdminHub for /admin/%s when signed in', (page) => {
    vi.spyOn(ws, 'loadAdminToken').mockReturnValue('jwt-token');
    expect(render(`/admin/${page}`)).toContain(`data-admin-page="${page}"`);
  });

  it('sends a visitor without a token to the login page', () => {
    vi.spyOn(ws, 'loadAdminToken').mockReturnValue('');
    // <Navigate> renders nothing on the server; the login route itself still mounts.
    expect(render('/admin/users')).not.toContain('data-admin-page');
    expect(render('/admin/login')).toContain('data-admin-page="login"');
  });
});
