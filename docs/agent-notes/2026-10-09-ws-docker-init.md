# Initialize ws with Docker Postgres

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Document how to initialize the Ugatan registration API (`ws/`) from a clean machine, especially Postgres via Docker Compose, then migrate, seed admin, and run the API for the staged `go-backend` work.

## What changed
- No code changes in this note-only task.
- Staged tree already includes [ws/deployments/docker-compose.yml](../../ws/deployments/docker-compose.yml) (Postgres 16 on host port **5433**), [ws/Makefile](../../ws/Makefile) (`docker-db-up` / `migrate-up` / `seed` / `run-api`), [ws/.env.example](../../ws/.env.example), and [ws/configs/seeder.yaml](../../ws/configs/seeder.yaml).
- Root [README.md](../../README.md) “Run the registration API (`ws`)” section matches the steps below.

## Decisions
- Postgres runs in Docker only; the Go API runs on the host (`make run-api`) so Windows/cmd Makefile recipes stay simple.
- Compose interpolates `POSTGRES_*` from `ws/.env` via `docker compose --env-file .env`. First volume create must use the final `POSTGRES_DB` (default `ugatan_db`); renaming later needs `down -v` and a fresh volume.
- Admin bootstrap is YAML (`configs/seeder.yaml`), not `ADMIN_*` env vars. Never commit real `ws/.env`, `PII_ENCRYPTION_KEY`, or `JWT_SECRET`.

## Verification
Commands for a clean init (from `ws/`):

```bash
cp .env.example .env
# edit PII_ENCRYPTION_KEY and JWT_SECRET (16+ chars each)
make docker-db-up      # postgres:16-alpine, 127.0.0.1:5433 → container 5432
make migrate-up        # goose: admin → invites/audit → conversations
make seed              # admin@ugatan.com from configs/seeder.yaml
make run-api           # http://127.0.0.1:8080
```

Web: set `VITE_WS_URL=http://127.0.0.1:8080` in `web/.env.local` (see `web/.env.example`), then open `/` for admin login and `/chat` after farmer QR claim.

Did not re-run Docker or migrate for this note; steps mirror prior [[2026-10-09-ws-admin-migrations-compose]] and [[2026-10-09-ws-makefile-windows]] verification.

## Follow-ups
- Unstage or delete `ws/bash.exe.stackdump` before commit (crash dump, not source).
- Product domain/handlers remain in tree but are unwired; safe to delete later.
- If `make migrate-up` fails with missing database after reusing an old volume, recreate with `make docker-db-down` then `docker compose --env-file .env -f deployments/docker-compose.yml down -v` and `make docker-db-up` again.
