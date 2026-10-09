# Admins table + email/password login UI

- Date: 2026-10-10
- Agent: Auto
- Status: done

## Task

Staff admin login should use email/password only; ws should not rely on farmer `users` for that access (dedicated admins).

## What changed

- [ws/internal/database/migrations/000004_admins.sql](../../ws/internal/database/migrations/000004_admins.sql) — `admins` table; move former `role=admin` rows out of `users`; `users.role` is `user` only
- [ws/internal/domain/admin/](../../ws/internal/domain/admin/) + [admin_repo.go](../../ws/internal/infrastructure/postgres/admin_repo.go) — admin aggregate + Postgres repo
- Login/Me/seed use `admins`; JWT role stays `admin`
- [web/src/admin/AdminApp.tsx](../../web/src/admin/AdminApp.tsx) — green-card login collects email/password, calls `POST /api/v1/auth/login`, redirects to `/admin`
- [README.md](../../README.md) — documents admins vs farmer users

## Decisions

- Keep farmer `users` for registration/QR; only staff credentials moved to `admins`.
- `/admin.html` login posts to the same API as `/admin/login`, then opens the real React admin shell.

## Verification

- `go test` on admin domain (+ compile of registration/http/seeders): passed
- `make migrate-up` + `make seed`: seed reports `admin@ugatan.com` present in `admins`
- `pnpm --filter @ugatan/web test`: 283 passed

## Follow-ups

- Manual browser check: `/admin.html` or `/admin/login` with seeder credentials → Users
