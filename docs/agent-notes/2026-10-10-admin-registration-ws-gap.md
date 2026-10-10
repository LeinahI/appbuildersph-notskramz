# Admin registration vs ws API gap

- Date: 2026-10-10
- Agent: Composer (file-search subagent)
- Status: done

## Task
Map how web admin registration talks to ws: RegistrationDialog/registration.ts, old RegisterPage, ws-api, and whether AdminApp saves users.

## What changed
- No code changes (research only).

## Decisions
N/A — exploration only.

## Findings
- New AdminApp `RegistrationDialog` is draft-only: Confirm / QR / revoke / scan buttons disabled; no `ws-api` imports.
- Draft fields: `fullName`, `age`, `barangay`, `municipality`, `province`, `consent` — does not match ws `Register` body (`birthDate`, nested `address` with `line1`/`city`/etc., optional `phone`/`idNumber`/`consentAt`).
- Live client APIs in [web/src/lib/ws-api.ts](../../web/src/lib/ws-api.ts): `registerUser`, `createInvite`, `regenerateInvite`, `revokeInvite`, `revokeUser`, `listUsers`, `getUser`.
- Old [RegisterPage.tsx](../../web/src/pages/admin/RegisterPage.tsx) + [UserDetailPage.tsx](../../web/src/pages/admin/UserDetailPage.tsx) call those APIs but are unreachable: `/admin/register` and `/admin/users/:id` redirect into AdminHub.
- AdminApp only uses `login` from ws-api; users/QR/activity pages are frontend shells.

## Verification
Read-only file inspection; no build/test run.

## Follow-ups
Wire RegistrationDialog → `registerUser` + `createInvite` (map age→birthDate or collect birthDate; expand address); restore user detail/QR actions or embed them in AdminApp.
