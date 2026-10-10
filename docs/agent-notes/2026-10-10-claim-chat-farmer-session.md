# Claim → chat farmer session + admin auth gate

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Wire `/claim?token=` to claim invite, persist farmer session, land on `/chat` with sidebar name/rename/logout; gate `/admin/*` (except login) on staff JWT.

## What changed
- [ws/internal/domain/user/user.go](../../ws/internal/domain/user/user.go) — `Rename` for farmer display name
- [ws/internal/application/registration/service.go](../../ws/internal/application/registration/service.go) — claim returns `fullName`/`status`; `UpdateMe`
- [ws/internal/transport/http/registration_handler.go](../../ws/internal/transport/http/registration_handler.go) — claim DTO + `PATCH` handler
- [ws/internal/transport/http/router.go](../../ws/internal/transport/http/router.go) — `PATCH /api/v1/me` (farmer JWT)
- [web/src/config/farmerSession.ts](../../web/src/config/farmerSession.ts) — localStorage session + deviceId
- [web/src/lib/ws-api.ts](../../web/src/lib/ws-api.ts) — `claimInvite`, `updateFarmerName`, farmer auth mode
- [web/src/pages/ClaimPage.tsx](../../web/src/pages/ClaimPage.tsx) + [web/src/main.tsx](../../web/src/main.tsx) — claim route → `/chat`
- [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx) — footer name, rename, logout
- [web/src/admin/AdminHub.tsx](../../web/src/admin/AdminHub.tsx) — redirect to login without admin token
- README + web tests for claim/admin/sidebar

## Decisions
- Chats stay Dexie-local; logout clears farmer JWT/name only.
- Guest sidebar shows “Walang account”; rename/logout only with a claimed session.
- Claim response carries `fullName` so the client needs no second round-trip.

## Verification
- `go test ./internal/domain/user/ …`: passed (Rename + existing claim tests).
- `pnpm exec vitest run test/admin-routes.test.tsx test/claim-page.test.tsx test/sidebar-profile.test.tsx`: 10 passed.
- Full `pnpm test` / manual QR claim not run in this session.

## Follow-ups
- Sync Dexie chats to ws farmer conversation APIs (out of scope).
- Manual: admin QR → claim link → sidebar name → rename → logout → `/admin/overview` without token.
