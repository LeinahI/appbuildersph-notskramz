# Admin credentials in seeder.yaml

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Move admin bootstrap out of `config.go` env vars into the seeder config.

## What changed
- Removed `AdminEmail` / `AdminPassword` / `AdminName` from [config.go](../../ws/internal/config/config.go)
- Admin seed reads [configs/seeder.yaml](../../ws/configs/seeder.yaml) via [seeder.go config](../../ws/internal/config/seeder.go) and [AdminSeeder](../../ws/internal/database/seeders/seeder.go)
- Stripped `ADMIN_*` from local `.env`; docs updated

## Decisions
Credentials live in seeder.yaml (hackathon bootstrap) instead of runtime Config.

## Verification
`make seed`: completed (admin already present or seeded)

## Follow-ups
Rotate/remove plaintext password from seeder.yaml before any public deploy.
