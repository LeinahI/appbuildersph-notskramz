# Resolve main merge conflicts

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Resolve the 4 merge conflicts from merging `main` into `implementing-guardrails` across 3 files.

## What changed
- [Home.md](../../Home.md) — kept both sides' agent-note lines (guardrail notes + offline-login merge note)
- [shared/src/index.ts](../../shared/src/index.ts) — unioned exports: `guardPromptLeak` / `leaksInstructions` from rails plus Laya and localized knowledge exports from main
- [web/src/App.tsx](../../web/src/App.tsx) — took main's `answerOnPhone` path; ported `guardPromptLeak` onto match and chat phone replies

## Decisions
Main's on-phone photo/Laya pipeline replaces the branch's inline explain/chat branches. Prompt-leak output rail stays by wrapping tidied phone replies in `guardPromptLeak` inside `answerOnPhone`, same as the pre-merge web path.

## Verification
- Conflict markers gone; three files staged; merge still awaiting commit
- `pnpm --filter @ugatan/shared build` + `test`: 268 passed
- Did not run full `pnpm test` / web build

## Follow-ups
Run `git commit` to conclude the merge when ready.
