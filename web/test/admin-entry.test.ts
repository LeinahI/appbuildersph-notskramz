import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webRoot = fileURLToPath(new URL('..', import.meta.url));

/**
 * Vite maps `admin.html` to both `/admin.html` and `/admin`. The staff portal routes
 * (`/admin/:page`, `/admin/login`) live in `index.html`, so a root `admin.html` steals
 * `/admin` and loops with AdminApp's `location.replace('/admin')`.
 */
describe('admin HTML entry', () => {
  it('keeps the preview entry off /admin so Vite does not steal the SPA staff routes', () => {
    expect(existsSync(join(webRoot, 'admin.html'))).toBe(false);
    expect(existsSync(join(webRoot, 'admin-preview.html'))).toBe(true);
  });
});
