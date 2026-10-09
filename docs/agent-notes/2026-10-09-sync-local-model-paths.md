# Sync the local Laya model across different folder paths

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: done

## Task
The user asked how teammates can share a setup when the local model sits in a different folder on each computer, then asked to configure it and make it work.

## What changed
- New [hub/src/env.ts](../../hub/src/env.ts) holds `loadEnvFile()`, moved out of [hub/src/main.ts](../../hub/src/main.ts).
- [eval/run.ts](../../eval/run.ts) now calls `loadEnvFile()`, so `pnpm eval` reads `hub/.env`.
- New [hub/vitest.config.ts](../../hub/vitest.config.ts) and [hub/test/setup-env.ts](../../hub/test/setup-env.ts) load `hub/.env` before tests, so the Laya tests run without a shell variable.
- Created `hub/.env` (gitignored) with this machine's path, `LAYA_MODEL_DIR=E:/models/laya-onnx`. Teammates write their own.
- [hub/.env.example](../../hub/.env.example) comment updated: one file now covers the hub, eval, and tests.
- Shell variables still win over the file.

## Decisions
One shared helper instead of three copies of the loader. Path stays in a gitignored per-machine file, not in the repo. Left the untracked `hub/_probe.ts` alone; it is not part of this task.

## Verification
- `pnpm build`: passed.
- `pnpm --filter @ugatan/hub test` with only `hub/.env`: 46 passed, including the 6 Laya tests (about 30 s, so the real model ran).
- `pnpm eval` with only `hub/.env`: Laya ran from the local bundle. Keyword 96.3% correct, Laya 40.7% correct on the 27 labeled rows. No pass mark set, so no verdict.
- Started the hub with `HUB_MATCHER=laya` on port 8799: `/health` reported matcher laya, and `POST /ask` returned `rice-blast` first for a rice-blast description. No `.laya-cache` folder appeared, so nothing was downloaded.
- Did not test on a second machine or a different path.

## Follow-ups
- Laya scored well below keyword matching on this eval set (en 22%, tl 11%). That matters for the adoption decision in the business plan.
- Teammates must copy `hub/.env.example` to `hub/.env` and set their own `LAYA_MODEL_DIR`.
