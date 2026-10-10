# Fix sidebar showing Magsasaka instead of claimed name

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Chat sidebar showed fallback “Magsasaka” instead of the farmer fullName (e.g. JM JM) after claim.

## What changed
- [ws/.../service.go](../../ws/internal/application/registration/service.go) — `GetMe`
- [ws/.../registration_handler.go](../../ws/internal/transport/http/registration_handler.go) — `GET /api/v1/me` farmer
- [ws/.../router.go](../../ws/internal/transport/http/router.go) — wire GET me
- [web/src/lib/ws-api.ts](../../web/src/lib/ws-api.ts) — `farmerMe()`
- [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx) — hydrate empty fullName from GET me
- [web/src/pages/ClaimPage.tsx](../../web/src/pages/ClaimPage.tsx) — dedupe StrictMode double-claim; always save session on success

## Decisions
Root cause: claim JWT was saved while `fullName` was missing (API process predating claim DTO enrichment, and/or StrictMode skipping save). Hydrate from GET me when local name is blank; keep claim once-per-token.

## Verification
- `pnpm exec vitest run test/sidebar-profile.test.tsx test/claim-page.test.tsx`: 6 passed.
- Restart `make run-api` so GET /me is live; reload `/chat`.

## Follow-ups
If name still wrong after reload, re-claim with a regenerated QR (old session may be a different user than JM JM).
