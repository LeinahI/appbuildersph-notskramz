# Admin registration + QR claim on `ws`

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Implement admin registration, roles, single-use QR onboarding, and `/admin` + `/claim` UI on the existing DDD Postgres `ws/` API (chat sidebar deferred).

## What changed
- Domain: [ws/internal/domain/user](../../ws/internal/domain/user), [invite](../../ws/internal/domain/invite), [audit](../../ws/internal/domain/audit) + migration [000002_users_invites_audit.sql](../../ws/internal/database/migrations/000002_users_invites_audit.sql)
- Application + HTTP: [registration service](../../ws/internal/application/registration/service.go), [handlers](../../ws/internal/transport/http/registration_handler.go), JWT admin middleware, claim public route
- PII: AES-GCM [pkg/crypto](../../ws/internal/pkg/crypto/pii.go); env `PII_ENCRYPTION_KEY` / `JWT_SECRET`; CORS includes Vite `:3000`
- Seed: admin via `ADMIN_EMAIL` + `ADMIN_PASSWORD` in [seeder](../../ws/internal/database/seeders/seeder.go)
- Web: react-router routes `/admin/*` and `/claim`; QR via `qrcode`; `VITE_WS_URL`
- Docs: [AGENTS.md](../../AGENTS.md), [README.md](../../README.md), [ws/README.md](../../ws/README.md), [openapi.yaml](../../ws/api/openapi.yaml)

## Decisions
- Kept Product sample routes; new work does not depend on them.
- Farmers stay `pending` until QR claim, then `active`.
- ID photo is on-device preview only; manual entry is primary.
- Module path left as `github.com/yourorg/ws` (documented); rename deferred.

## Verification
- `go test ./internal/domain/... ./internal/pkg/...`: passed
- `go build ./cmd/api ./cmd/seed ./cmd/migrate`: passed
- `pnpm exec tsc --noEmit` in `web/`: passed
- Did not run Postgres migrate/seed against a live DB in this session

## Follow-ups
- Run `make docker-db-up && make migrate-up && make seed && make run-api` with a real `.env`
- Smoke-test `/admin` login → register → QR → `/claim` end to end
- Optional: rename Go module path to Ugatan-scoped
