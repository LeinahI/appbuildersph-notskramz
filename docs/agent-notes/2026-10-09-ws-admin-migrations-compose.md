# ws admin migrations and compose env

- Date: 2026-10-09
- Agent: fullstack-developer (Composer)
- Status: done

## Task
Align Postgres credentials with env for docker compose, reorder goose migrations (users first, drop products), remove product seed/routes, and fresh migrate + seed admin as Ugatan Admin.

## What changed
- [ws/deployments/docker-compose.yml](../../ws/deployments/docker-compose.yml) — `POSTGRES_*` via `${VAR}` + `env_file: ../.env`; healthcheck uses container `POSTGRES_USER`/`POSTGRES_DB`; no `ADMIN_*`
- [ws/Makefile](../../ws/Makefile) — `docker-db-up`/`down` pass `--env-file .env` for compose interpolation
- [ws/.env.example](../../ws/.env.example) — `DATABASE_URL` db name matches `POSTGRES_DB=ugatan_db`; placeholder `ADMIN_*` for seed docs only
- [ws/.env](../../ws/.env) — `DATABASE_URL` path synced to `POSTGRES_DB` (not committed)
- Migrations: deleted `000001_products.sql`; added [000001_admin.sql](../../ws/internal/database/migrations/000001_admin.sql) (users + pgcrypto); [000002_users_invites_audit.sql](../../ws/internal/database/migrations/000002_users_invites_audit.sql) = invites + audit only; [000003_conversations.sql](../../ws/internal/database/migrations/000003_conversations.sql) unchanged
- [ws/internal/database/seeders/seeder.go](../../ws/internal/database/seeders/seeder.go) + [ws/cmd/seed/main.go](../../ws/cmd/seed/main.go) — product seeder removed; admin-only seed from env
- [ws/internal/transport/http/router.go](../../ws/internal/transport/http/router.go) — product routes unwired
- [ws/configs/seeder.yaml](../../ws/configs/seeder.yaml) — no demo products

## Decisions
- Split users into `000001_admin.sql` so admin seed works before invites/audit.
- Dropped product routes (not only seeder) so API does not hit a missing `products` table; product domain/handler packages left in tree unused.
- Recreated Docker volume because goose history/version numbers changed.

## Verification
- `docker compose --env-file .env … down -v` then `up -d db`: healthy
- `make migrate-up`: versions 1–3 applied; tables `users`, `invites`, `audit_events`, `conversations`, `messages` (no `products`)
- `make seed`: seeded admin `admin@ugatan.com` (name from `ADMIN_NAME`)
- `go build` `./cmd/api` `./cmd/seed` `./cmd/migrate` and domain unit tests: passed
- Did not run full `pnpm test` / integration tests / `make swagger`

## Follow-ups
- Product domain/HTTP/OpenAPI still in repo but unwired; delete later if unused.
- `internal/config/seeder.go` still validates `demo_products` if called; seed no longer loads it.
