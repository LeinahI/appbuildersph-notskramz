# Fix /admin infinite redirect loop

- Date: 2026-10-10
- Agent: fullstack-developer (Composer)
- Status: done

## Task

Diagnose and fix `ERR_TOO_MANY_REDIRECTS` / blank loop at `http://localhost:3000/admin`.

## What changed

- Renamed `web/admin.html` → [web/admin-preview.html](../../web/admin-preview.html) so Vite no longer serves the preview SPA at `/admin`
- [web/vite.config.ts](../../web/vite.config.ts) — MPA input + PWA denylist point at `admin-preview.html`
- [README.md](../../README.md) — preview URL docs
- [web/test/admin-entry.test.ts](../../web/test/admin-entry.test.ts) — regression: no root `admin.html`
- [web/test/admin-routes.test.tsx](../../web/test/admin-routes.test.tsx) — `RequireAdmin` token guards
- [web/test/admin.test.tsx](../../web/test/admin.test.tsx) — preview login with token calls `location.replace('/admin')`

## Decisions

Root cause was a path collision, not `RequireAdmin` ↔ `LoginPage`. Vite maps `admin.html` to both `/admin.html` and `/admin`, so the staff SPA never loaded. After wiring preview login to `window.location.replace('/admin')`, that reload hit the same preview page again → loop. Renaming the preview entry is the smallest fix; AdminApp’s `/admin` redirects then correctly enter the real portal.

## Verification

- `curl http://localhost:3000/admin` → `index.html` / `main.tsx` (staff SPA)
- `curl http://localhost:3000/admin-preview.html` → preview entry / `admin/main.tsx`
- `pnpm --filter @ugatan/web test`: 287 passed (28 files)
- Manual browser QA with a live `ws` login not run in this session (hard-refresh if an old SW still caches `/admin`)

## Follow-ups

- If a browser still loops, unregister the Ugatan service worker / clear site data for localhost:3000 once
