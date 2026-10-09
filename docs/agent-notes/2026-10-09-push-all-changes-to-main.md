# Push all pending changes to main

- Date: 2026-10-09
- Agent: Claude Haiku 5.5
- Status: done

## Task
Commit all pending working-tree changes and push them to `origin/main`.

## What changed
- Committed the existing uncommitted changes across `web/`, `hub/`, `shared/`, and `docs/`, plus new files [web/src/components/SettingsDialog.tsx](../../web/src/components/SettingsDialog.tsx) and this note. No new code was written for this task.
- `.env` files, `hub/logs/`, and `eval/results/` remain git-ignored and were not staged.

## Decisions
- Pushed directly to `main` because the user asked for it explicitly.
- Skipped the test run at the user's request. `pnpm build` passed before the push.

## Verification
- `pnpm build`: passed.
- `pnpm test`: not run to completion (user asked to push immediately).

## Follow-ups
- Run `pnpm test` on the pushed commit.
