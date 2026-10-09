# Branch and PR for pending work

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Create a new branch from `go-backend` and open a pull request with the pending working-tree changes.

## What changed
- No code changes. Committed the existing pending work (farmer/admin login split, offline Laya, photo eval set, knowledge updates) on branch `offline-farmer-login-photo-eval`.
- Left out `hub/_stress.tmp.ts` (scratch file). `.env` files stay ignored.
- Related notes: [[2026-10-10-photo-eval-and-confidence]], [[2026-10-10-split-farmer-admin-login]], [[2026-10-10-standalone-offline-assessment]], [[2026-10-10-local-only-offline]].

## Decisions
Branched from `go-backend` so the PR carries only the pending work on top of it. No Claude co-author trailer, per the user's standing preference.

## Verification
Did not run `pnpm build` or `pnpm test` for this task.

## Follow-ups
None
