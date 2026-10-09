# Fix ws Makefile for Windows cmd

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
`make migrate-up` failed on Windows: `DATABASE_URL="..." go run` is not valid in cmd.exe.

## What changed
- [ws/Makefile](../../ws/Makefile): recipes no longer prefix Unix-style env vars; rely on `ws/.env`
- [ws/cmd/migrate/main.go](../../ws/cmd/migrate/main.go): load godotenv like api/seed
- Created missing Postgres database `ws` on reused docker volume (volume had `golang_ecommerce` from an earlier init)

## Decisions
Godotenv + plain `go run` is simpler and cross-platform than Makefile OS branching.

## Verification
- Created DB `ws`; `make migrate-up` and `make seed` succeeded (admin seeded)
- `make run-api` started in background

## Follow-ups
- Reused docker volume had only `golang_ecommerce`; `POSTGRES_DB=ws` only applies on first volume init
