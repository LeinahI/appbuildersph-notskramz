# Run pnpm dev

- Date: 2026-10-09
- Agent: Claude Haiku 5.5
- Status: done

## Task
Start the dev server with `pnpm dev` from the repo root.

## What changed
No code changes. The root `dev` script builds [shared](../../shared) with `tsc`, then starts the Vite dev server in [web](../../web).

## Decisions
Ran the root script rather than `pnpm --filter @ugatan/web dev` directly, so `shared` is built first as [AGENTS.md](../../AGENTS.md) requires.

## Verification
`pnpm dev`: shared build succeeded, Vite ready in 551 ms at http://localhost:3000/. Did not open the page in a browser.

## Follow-ups
None
