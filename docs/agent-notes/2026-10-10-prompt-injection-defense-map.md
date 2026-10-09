# Prompt-injection / prompt-leak defense map

- Date: 2026-10-10
- Agent: Composer (file-search subagent)
- Status: done

## Task
Read-only map of current prompt-injection and prompt-leak defenses for Ugatan chat (rails, conversation, prompts, hub ask, phone AI, tests, Tagalog leak phrases, output-side leak detection).

## What changed
- No code changes
- Probed `isInjectionAttempt` against English/Tagalog "repeat words above / system instructions / blockquote" samples via built `shared/dist`

## Decisions
N/A (research only). Findings for the parent: input rail is regex-only; output rail is grounding + pesticide, not prompt-leak; Laya is pest-choice matcher only.

## Verification
- Read [shared/src/rails.ts](../../shared/src/rails.ts), [shared/src/conversation.ts](../../shared/src/conversation.ts), [shared/src/prompt.ts](../../shared/src/prompt.ts), [hub/src/answer.ts](../../hub/src/answer.ts), [web/src/App.tsx](../../web/src/App.tsx), [shared/test/rails.test.ts](../../shared/test/rails.test.ts), [hub/src/matchers/laya.ts](../../hub/src/matchers/laya.ts)
- Node probe of sample phrases against built `isInjectionAttempt` (not a full `pnpm test` run)

## Follow-ups
- Expand Tagalog/English leak patterns; add output leak strip for "You are Ugatan" / system-prompt echoes; ensure web symptom-pick path honors injection like the hub.
