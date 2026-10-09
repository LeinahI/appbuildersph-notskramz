# Merge offline-farmer-login-photo-eval into main

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Push all changes to `main` and resolve any conflicts. `main` had gained the chat deep-link and logout-confirm PR ([[2026-10-10-chat-conversation-urls]], [[2026-10-10-logout-confirm-modal]]) while the branch split the logins ([[2026-10-10-split-farmer-admin-login]]).

## What changed
- Merged `offline-farmer-login-photo-eval` into `main`; conflicts in AGENTS.md, Home.md, README.md, [web/src/pages/ClaimPage.tsx](../../web/src/pages/ClaimPage.tsx), and the old `LoginPage.tsx`.
- Kept the branch's split login (`/login` farmer, `/admin/login` staff) and deleted main's unified `LoginPage.tsx`. Its one change, `chatHref()`, now lives in [web/src/pages/FarmerLoginPage.tsx](../../web/src/pages/FarmerLoginPage.tsx).
- ClaimPage keeps main's `chatHref()` and sends the logged-out farmer back to `/login`.
- Docs list both sets of notes and routes (`/chat/:conversationId` plus the split logins).
- Tests in [web/test/app.test.tsx](../../web/test/app.test.tsx) and [web/test/home-page.test.tsx](../../web/test/home-page.test.tsx) now expect the Tagalog label `Mag-log out` that main's logout dialog uses.

## Decisions
The split login is the newer design, so it wins over the unified page; main's deep links and logout dialog are kept.

## Verification
`pnpm build` and `pnpm test` passed after the merge (shared 260, web 196, hub 207). Did not run the app by hand or `ws` tests.

## Follow-ups
None
