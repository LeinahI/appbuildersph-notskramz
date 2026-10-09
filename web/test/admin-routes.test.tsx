import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AdminHub from '../src/admin/AdminHub';

vi.mock('../src/admin/AdminApp', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/admin/AdminApp')>();
  return {
    ...mod,
    AdminApp: ({ page }: { page?: string }) => createElement('div', { 'data-admin-page': page ?? '' }, 'AdminApp'),
  };
});

describe('admin SPA routes (FrontEnd AdminApp)', () => {
  it('mounts AdminHub for /admin/overview', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/admin/overview'] },
        createElement(Routes, null, createElement(Route, { path: '/admin/:page', element: createElement(AdminHub) })),
      ),
    );
    expect(html).toContain('data-admin-page="overview"');
  });

  it('mounts AdminHub for /admin/users', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/admin/users'] },
        createElement(Routes, null, createElement(Route, { path: '/admin/:page', element: createElement(AdminHub) })),
      ),
    );
    expect(html).toContain('data-admin-page="users"');
  });
});
