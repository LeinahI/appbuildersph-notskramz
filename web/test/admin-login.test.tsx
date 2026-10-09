import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AdminLoginPage from '../src/pages/admin/LoginPage';
vi.mock('react-router-dom', async (original) => ({
  ...await original<typeof import('react-router-dom')>(),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock('../src/config/ws', () => ({ loadAdminToken: () => '', saveAdminToken: vi.fn() }));
describe('canonical staff login', () => {
  it('keeps sign-in and remember me without password recovery UI', () => {
    const html = renderToStaticMarkup(<AdminLoginPage />);
    expect(html).toContain('Staff sign in');
    expect(html).toContain('Work email');
    expect(html).toContain('Remember me');
    expect(html).not.toMatch(/Forgot password|Nakalimutan|reset your password/);
  });
});
