# Merge PR #8 (farmer claim, hub app-download activation) into main

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done

## Task
Merge https://github.com/LeinahI/appbuildersph-notskramz/pull/8 (`navigate-to-chat`) into `main` and fix any gaps.

## What changed
- 12 files conflicted. `main` (see [[2026-10-10-fix-open-gaps]]) and the PR had each wired the admin to `ws` separately. Kept main's admin ([AdminApp.tsx](../../web/src/admin/AdminApp.tsx), [RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx), [registration.ts](../../web/src/admin/registration.ts), [copy.ts](../../web/src/admin/copy.ts), [admin.css](../../web/src/admin/admin.css), admin tests). It already has the stats, user drawer, birth-date form, and auth guard. The PR's age-only form and its second user list were dropped.
- [AdminHub.tsx](../../web/src/admin/AdminHub.tsx): the auto-merge had added the token guard and its import twice. Restored main's copy.
- Ported the PR's admin intent into [UserPanel.tsx](../../web/src/admin/UserPanel.tsx): no Regenerate QR button. While a pending user has an open QR, the drawer polls `getUser` every 3 s and refreshes when the status changes. QR copy now says the QR downloads the app and a finished download makes the user active.
- Go: took the PR's PII-only `users` (no email/password, migration `000005`) and main's `Stats`. Added `Stats` to the PR's `memUsers` test fake, which would not compile against main's `user.Repository`.
- [ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx): rebuilt from main's sidebar and added the PR's farmer profile footer: name (filled from `GET /me` when missing), rename via `PATCH /me`, logout. These use main's single action dialog instead of the PR's separate dialogs. A failed rename now shows an error; the PR closed the dialog without one. New `profile*` labels in tl/en/ceb in [labels.ts](../../web/src/config/labels.ts). [sidebar-profile.test.tsx](../../web/test/sidebar-profile.test.tsx) updated for main's sidebar props.
- `CLAIM_BASE_URL` default changed from `http://localhost:8787` to the hotspot address `http://192.168.137.1:8787` in [config.go](../../ws/internal/config/config.go), [service.go](../../ws/internal/application/registration/service.go), and [ws/.env.example](../../ws/.env.example). A phone that scans the QR cannot open `localhost`. The PR's own note listed this as a follow-up.
- Fixed a type error in [claim-page.test.tsx](../../web/test/claim-page.test.tsx) (`tsc` failed on the PR branch too). Fixed the stale `/claim` comment in [main.tsx](../../web/src/main.tsx). [README.md](../../README.md) admin paragraph merged and now describes the QR download activation flow.

## Decisions
Main's admin was the more complete of the two versions, so I kept it and moved only the PR's behavior changes into it. Moving main's features into the PR's version would have meant more rewriting. I left the PR's activation design (one APK download activates the newest open invite) as it is. That is the PR author's documented choice.

## Verification
- `go vet ./...`, `go test ./...` in `ws`: passed. `gofmt -l`: clean.
- `pnpm --filter @ugatan/web exec tsc --noEmit -p .`: passed.
- `pnpm build`: passed.
- `pnpm test`: shared 379 passed; hub 202 passed, 21 skipped; web 412 passed.
- Not run: browser QA of the merged admin and sidebar, migration `000005` on a live Postgres, a real phone APK download flipping a user to active.

## Follow-ups
- Activation matches the newest open invite, not the phone that scanned. Two open QRs and one download will activate the wrong user. A token in the `/app` URL would fix this.
- With token-less QRs nothing links to `/claim?token=…`, so the farmer session (sidebar name, rename) only exists if someone opens a claim link by hand. Decide whether the app should claim after install.
- `POST /invites/downloaded` accepts only loopback. If `ws` runs in Docker, the hub's call gets a 403 and users stay pending.
