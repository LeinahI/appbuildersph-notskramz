# AdminApp save + invite; drop farmer credentials from ws

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Wire AdminApp Confirm/QR to live ws register + invite APIs, and remove leftover farmer email/password columns from `users`.

## What changed
- Migration [000005_users_drop_credentials.sql](../../ws/internal/database/migrations/000005_users_drop_credentials.sql) — drop `users.email` / `password_hash`
- [user.go](../../ws/internal/domain/user/user.go) + [user_repo.go](../../ws/internal/infrastructure/postgres/user_repo.go) — farmers are PII-only; no `RoleAdmin` / `FindByEmail`
- [registration.ts](../../web/src/admin/registration.ts) — `draftToRegisterBody`, age ≥ 18
- [RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx) — `registerUser`, `createInvite` / regenerate, QR download
- [AdminApp.tsx](../../web/src/admin/AdminApp.tsx) — `listUsers`, open saved user for QR; login gate
- [README.md](../../README.md) — staff vs farmer credential split

## Decisions
Keep staff email/password on `admins`. Age-only UI maps to `birthDate` as Jan 1 of (UTC year − age). Confirm requires admin JWT.

## Verification
- `go test ./internal/domain/...`: passed
- `pnpm --filter @ugatan/web exec vitest run test/admin.test.tsx`: 40 passed
- `make migrate-up` for 000005 (run in session)

## Follow-ups
- Overview metric cards still show “—” (not wired to counts)
- Activity page still empty shell (audit list not wired)
- Restart `make run-api` after migrate so the new schema is live
