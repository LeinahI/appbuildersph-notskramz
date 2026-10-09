# Merge main into go-backend (PR 1)

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Make PR 1 (`go-backend` into `main`) mergeable: it had conflicts in 9 files and a lockfile that did not match `web/package.json`.

## What changed
- Merged `origin/main` into `go-backend`. Docs ([AGENTS.md](../../AGENTS.md), [Home.md](../../Home.md), `.gitignore`) keep both sides.
- [web/src/App.tsx](../../web/src/App.tsx) is `main`'s new home UI (HomePage, photo, voice, help dialog) with `go-backend`'s conversations, sidebar and log-out ported onto it. Each conversation keeps its own hub session id.
- [web/src/components/HomePage.tsx](../../web/src/components/HomePage.tsx): the settings button is now an optional log-out button (`onLogout`).
- Deleted `SettingsDialog.tsx`. `go-backend` had already removed settings and fixed the hub address, so that decision stands.
- [web/src/index.css](../../web/src/index.css): `main`'s green theme plus the tokens and classes the sign-in, admin and sidebar screens use, mapped onto the green palette. Dark mode for those screens is gone.
- [web/src/config/labels.ts](../../web/src/config/labels.ts): `main`'s three-language labels. [web/src/lib/db.ts](../../web/src/lib/db.ts) and [web/src/main.tsx](../../web/src/main.tsx): both sides kept.
- `pnpm-lock.yaml`: `react-router-dom` specifier synced to the pinned `6.30.6` (the PR's lockfile said `^6.30.6`, so a frozen install failed).
- Tests: `home-page` and `app` tests use the log-out button; `app` renders inside `MemoryRouter`.

## Decisions
Took `main`'s UI as the base because it is the newer, tested one, and added the account and conversation features to it, not the other way round.

## Verification
- `pnpm build`: passed.
- `pnpm -r test`: shared 250 and web 135 passed. Hub `laya.test.ts` timed out once under the parallel run and passed alone (7/7).
- Not run: the app in a browser, the Go `ws` tests, anything against a live Postgres.

## Follow-ups
- Look at the merged chat screen in a browser (sidebar beside the new home UI, log-out button).
- GitGuardian still fails on PR 1; the finding has not been looked at.
