# Commit and push all pending changes to main

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Commit every pending change in the working tree and push it to `origin/main`.

## What changed
- No code changes of its own. Committed the existing UI redesign, natural-reply, guides and language work, then merged `origin/main` (PR #6, browser voice STT and admin email login) before pushing.

## Decisions
- Merge rather than rebase, so the local history stays as it was.
- Commit authored by jncdrx only, no Claude trailer.

## Verification
Merged origin/main (PR #6) with conflicts in Home.md, hub/.env.example, HelpDialog.tsx, VoiceInput.tsx and index.css, kept both sides. `pnpm build` passed, web tests 343 passed. Hub `gemma.test.ts` hung with worker timeouts because it loads the real local Gemma model from hub/.env, so hub tests were not fully green.

## Follow-ups
None
