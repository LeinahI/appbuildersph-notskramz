# QR points at the hub app download

- Date: 2026-10-10
- Agent: Grok 4.7
- Status: done

## Task
Remove Regenerate QR from the invitation panel, point every generated QR at `http://localhost:8787/app` with no token, and mark that registration active when the APK download finishes.

## What changed
- [web/src/admin/RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx) — dropped the Regenerate QR button. The record and QR steps show the saved user's status. While the QR step is open, the dialog polls `getUser` every 2 seconds and shows Active when the status flips.
- [web/src/admin/copy.ts](../../web/src/admin/copy.ts) and [web/test/admin.test.tsx](../../web/test/admin.test.tsx) — removed the regenerate label and the test that expected that button.
- [ws/internal/application/registration/service.go](../../ws/internal/application/registration/service.go) — `claimURL` is `{CLAIM_BASE_URL}/app` with no token (default `http://localhost:8787`). `MarkDownloaded` consumes the newest open invite and calls `User.Activate()`.
- [ws/internal/domain/invite/invite.go](../../ws/internal/domain/invite/invite.go) and [ws/internal/infrastructure/postgres/invite_repo.go](../../ws/internal/infrastructure/postgres/invite_repo.go) — `FindNewestActive`.
- [ws/internal/transport/http/router.go](../../ws/internal/transport/http/router.go) — `POST /api/v1/invites/downloaded`, loopback only.
- [hub/src/server.ts](../../hub/src/server.ts) and [hub/src/main.ts](../../hub/src/main.ts) — a finished `GET /app/ugatan.apk` (not HEAD, not a later byte range) notifies that endpoint. `WS_URL` defaults to `http://127.0.0.1:8080`.
- Local `ws/.env` `CLAIM_BASE_URL` set to `http://localhost:8787` (not committed). API restarted.

## Decisions
The QR text is the same download link for every user. The invite stays on the server so the next finished download can activate that registration. Two open invites and one download activate the newer registration. The notify route accepts only loopback so a phone cannot flip status by calling the API.

## Verification
- `go test ./internal/application/registration/` passed. `go build ./internal/transport/http/` passed.
- Hub `test/app-page.test.ts` (5) and web `test/admin.test.tsx` (40) passed.
- Logged into `/admin`, opened a pending user, generated a QR. The panel shows Generate QR and Download QR, no Regenerate QR, status Pending account link, and `http://localhost:8787/app`. Hub `GET /app` and API `GET /up` returned 200.
- Did not download the APK from a phone, so the live pending-to-active flip was not exercised in the browser.

## Follow-ups
A phone on the hotspot cannot open `localhost`. Set `CLAIM_BASE_URL` to the laptop's hotspot address (path stays `/app`) before a phone scan. `pnpm --filter @ugatan/hub build` still fails on existing `@ugatan/shared` type errors in `hub/src/answer.ts`; `tsc` emitted `hub/dist` anyway. Shared was rebuilt so the hub could start from source.
