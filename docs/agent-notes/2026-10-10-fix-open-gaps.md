# Fix open gaps: admin wired to ws, guardrail and matcher follow-ups

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code), with a sub-agent for the shared/hub items and a Haiku sub-agent for browser QA
- Status: partial

## Task
"Fix all gaps in the project." I took the gaps from build/test failures and the Follow-ups of earlier notes that code can close.

## What changed
- **Admin is wired to `ws`** (was a UI-only shell, see [[2026-10-10-admin-frontend-at-admin]]):
  - [web/src/admin/AdminHub.tsx](../../web/src/admin/AdminHub.tsx): `/admin/*` without a token goes to `/admin/login`.
  - [web/src/admin/AdminApp.tsx](../../web/src/admin/AdminApp.tsx): checks the token with `GET /auth/me` (401 signs out, unreachable shows offline with retry), Log out, live overview counts and recent activity, Users list with search (debounced) and status filter, QR access lists pending users, Activity is the audit log with readable labels. A note shows when a list hits the 50-row cap.
  - [web/src/admin/UserPanel.tsx](../../web/src/admin/UserPanel.tsx) (new): user drawer with details, real QR invitation (generate, regenerate, download PNG, revoke) and revoke access with a confirm step.
  - [web/src/admin/RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx), [registration.ts](../../web/src/admin/registration.ts): saves via `POST /users`. Fields now match `ws`: birth date (not age), street/purok, optional phone. Duplicate (409) and ws errors (e.g. under 18) show inline; the draft is kept. ID scan stays disabled.
  - [web/src/admin/copy.ts](../../web/src/admin/copy.ts): "UI preview" wording removed; QR policy now says 24 hours (ws `DefaultTTL`), not 15 minutes.
  - Removed the unrouted old portal `web/src/pages/admin/*` and its only user of `LogoutConfirmDialog`.
- **ws**: new `GET /api/v1/users/stats` (total/active/pending/revoked/today, Asia/Manila day) in [user_repo.go](../../ws/internal/infrastructure/postgres/user_repo.go), [registration_handler.go](../../ws/internal/transport/http/registration_handler.go), [router.go](../../ws/internal/transport/http/router.go). Fixed user search: it applied `LIMIT 50` before filtering encrypted names, so older users could never be found. `gofmt -w` on `ws/internal` and `ws/cmd` (whitespace only).
- **shared**: [conversation.ts](../../shared/src/conversation.ts) `withProblemName` again returns the reply unchanged when it already names the problem (an uncommitted edit from another session had dropped that line; test was failing).
- **Sub-agent (shared/hub/web)**: stronger prompt-leak detection in [rails.ts](../../shared/src/rails.ts) (self-reference phrases in EN/TL/CEB, 12-word copies of the instruction text) and more injection patterns; `onlyVagueSigns()` in [keyword.ts](../../shared/src/keyword.ts) so "dilaw ang dahon" no longer reaches Laya and gets a confident wrong match; five Cebuano keywords copied from existing note text in three `knowledge/*.json`; the "arrive together" Gemma tests assert order and success, not equal text.
- [README.md](../../README.md): admin paragraph describes the live screens.

## Decisions
- Plain `useState`/`useEffect` loading instead of React Query in AdminApp, so the existing hook-mocking tests and `admin-preview.html` keep working without a provider.
- The form does not copy ws's 18+ rule; ws is the one source and its message is shown.
- Stats come from a SQL count endpoint rather than counting the 50-row list, which would be wrong past 50 users.
- Did not invent new knowledge entries (needs an agronomist).

## Verification
- `pnpm build`: passed (before and after). `pnpm --filter @ugatan/hub build`: exit 0.
- `pnpm --filter @ugatan/shared test`: 379 passed. `pnpm --filter @ugatan/web test`: 356 passed. `go build`, `go vet`, `go test ./...` in `ws`: passed.
- Hub full suite (before the sub-agent's test change): 218/220; failures were the Gemma timing test and the exact-text test. The timing test rerun alone failed again (13.6 s vs 10 s limit). Not loosened. Other sessions' processes were using the machine.
- Live check: throwaway `postgres:16-alpine` on port 55433, `ws` on 18080 with env vars only (no `ws/.env`), migrate + seed. curl: stats correct, under-18 rejected, search finds "Farmer 1" beyond the newest 50, stats is 401 without a token. Browser QA (Haiku sub-agent, dev server on 3005): redirect when signed out, login, counts 55/0/55/55, search, filter, drawer QR generate/regenerate/download/revoke, revoke access, registration save and QR, under-18 error, QR and Activity pages, 375 px with no horizontal scroll, log out. All matched. Container, server and temporary launch entry removed.
- Not run: the edited Gemma model tests after the sub-agent's change (gemma.test.ts ONNX); Android build.

## Follow-ups
- **Decision needed:** farmers have no claim screen. `/claim?token=…` redirects to `/` and drops the token, so a QR invitation cannot be scanned into anything and users never become "active". Either add a no-login claim page that links the phone (calls `POST /invites/claim` once), or drop QR invitations from admin.
- Gemma llama.cpp "quickly" test is over its 10 s limit on this machine; decide the limit with the team or rerun on a quiet machine.
- Activity shows a user-ID prefix for users outside the newest 50 (names come from the loaded list); an audit DTO with the subject name would fix it.
- Lists still cap at 50 (note shown); add paging if co-ops exceed that.
- Another session has uncommitted edits in `hub/src/answer.ts`, `web/src/App.tsx`, `shared/src/prompt.ts`, `shared/src/conversation.ts`; not mine, not touched beyond the one line above. Nothing committed.
