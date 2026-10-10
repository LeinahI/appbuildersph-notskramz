# Merge origin/FrontEnd into main

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Merge `origin/FrontEnd` (f328594) into `main` and resolve conflicts. The working tree held ~72 uncommitted files.

## What changed
- Merge commit c7fbbaa: the only committed conflict was [Home.md](../../Home.md); kept both sets of note lines.
- The uncommitted work was stashed, then restored on top of the merge. It collided with FrontEnd's static admin rewrite in [AdminApp.tsx](../../web/src/admin/AdminApp.tsx), [RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx), [copy.ts](../../web/src/admin/copy.ts), [App.tsx](../../web/src/App.tsx) and [admin.test.tsx](../../web/test/admin.test.tsx).
- Admin keeps the live ws wiring (users, stats, QR invites, activity). Login stays at `/admin/login` with `RequireAdmin`, so `LoginPage.tsx`, `AdminLayout.tsx` and `LogoutConfirmDialog.tsx` were restored.
- `App.tsx` keeps FrontEnd's draft/navigation protection plus hub auto-discovery; `syncNow(version, id, url)`.
- Renamed the connection classes `admin-preview-*` to `admin-status-*`; restored their base CSS.
- Tests: mocked `hub-discovery` and window listeners in [chat-navigation.test.tsx](../../web/test/chat-navigation.test.tsx); dropped FrontEnd assertions that expected a disabled, offline save.

## Decisions
The WIP admin wiring is newer and depends on the untracked `UserPanel.tsx`, so it wins over FrontEnd's static shell. FrontEnd's single-login and no-banner rules were kept.

## Verification
`tsc --noEmit`: clean. `vitest run` in web: 40 files, 406 tests passed. `vite build`: passed. Not run: hub, shared and ws tests, browser/Android QA. Nothing pushed.

## Follow-ups
Uncommitted work is still in the tree for review and commit. Push when ready.
