import { createElement, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Navigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as ws from '../src/config/ws';
import { RequireAdmin } from '../src/pages/admin/AdminLayout';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin SPA route guards', () => {
  it('sends unauthenticated /admin to /admin/login once', () => {
    vi.spyOn(ws, 'loadAdminToken').mockReturnValue('');
    const el = RequireAdmin({ children: createElement('div', { 'data-admin': 'shell' }, 'Users') });
    expect(isValidElement(el)).toBe(true);
    expect((el as ReactElement).type).toBe(Navigate);
    expect((el as ReactElement).props).toMatchObject({ to: '/admin/login', replace: true });
  });

  it('renders the admin shell when a token is present', () => {
    vi.spyOn(ws, 'loadAdminToken').mockReturnValue('jwt-token');
    const el = RequireAdmin({ children: createElement('div', { 'data-admin': 'shell' }, 'Users') });
    expect(renderToStaticMarkup(el as ReactElement)).toContain('data-admin="shell"');
  });
});
