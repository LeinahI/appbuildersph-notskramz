# Serve FrontEnd AdminApp at /admin

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Make `http://localhost:3000/admin` show the updated FrontEnd admin UI (sidebar Overview / Users / QR / Activity from commit `063a4cc`), not the older top-nav Farmers/Register/Audit portal.

## What changed
- [web/src/admin/AdminHub.tsx](../../web/src/admin/AdminHub.tsx) — SPA wrapper; path routes drive AdminApp
- [web/src/admin/AdminApp.tsx](../../web/src/admin/AdminApp.tsx) — optional controlled `page` / `onNavigate`; login lands on `/admin/overview`
- [web/src/main.tsx](../../web/src/main.tsx) — `/admin` → `/admin/overview`; `/admin/:page` mounts AdminHub; old register/audit/user-detail paths redirect
- Tests + [README.md](../../README.md) updated
- `/admin-preview.html` kept as hash-route QA entry (still must not be named `admin.html`)

## Decisions
Mount the existing AdminApp in the main SPA instead of restoring `admin.html` (that stole `/admin` and looped). Old `pages/admin/*` portal is no longer routed; files left on disk unused for now.

## Verification
- `vitest` admin.test / admin-routes / admin-entry (run in session)
- Manual: hard-refresh `http://localhost:3000/admin` → Overview sidebar UI

## Follow-ups
Wire AdminApp list/metrics/registration to `ws` so the shell is not UI-empty forever.
