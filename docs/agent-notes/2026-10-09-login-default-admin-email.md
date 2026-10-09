# Login default admin email

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Align login form default with seeded admin email after migration/compose work.

## What changed
- [LoginPage.tsx](../../web/src/pages/LoginPage.tsx): default email `admin@ugatan.com`
- [ws/.env.example](../../ws/.env.example): `ADMIN_EMAIL=admin@ugatan.com` (placeholder password only)

## Decisions
Real password stays only in local `ws/.env`, never in example.

## Verification
DB has active admin `admin@ugatan.com`; goose 000001–000003 applied.

## Follow-ups
None
