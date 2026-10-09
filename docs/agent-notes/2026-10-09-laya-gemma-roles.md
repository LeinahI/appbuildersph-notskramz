# Make Laya and Gemma work together by role

- Date: 2026-10-09
- Agent: Claude Opus 5.5
- Status: done

## Task
Make Gemma and Laya work together based on their responsibilities. Laya (through the hybrid matcher) decides the problem. Gemma explains it.

## What changed
- [shared/src/prompt.ts](../../shared/src/prompt.ts): the system prompt now says a matching step already chose the notes and the model explains them rather than diagnosing. `buildMessages` takes `{ maxWords, sure }` instead of a bare `maxWords`, and adds a `Match: sure` or `Match: not sure` line to the user message. New `notesToExplain(entries, sure)` keeps only the top note when sure and every candidate when not.
- [hub/src/answer.ts](../../hub/src/answer.ts): Gemma gets `notesToExplain(...)` plus the matcher's `clear`. With no matched notes, Gemma is skipped and the log says `skipped-no-match`. The response still carries all match ids for the curated notes.
- [hub/src/explain/index.ts](../../hub/src/explain/index.ts): `ExplainInput` has `clear`. Both Gemma routes ([gemma-llamacpp.ts](../../hub/src/explain/gemma-llamacpp.ts), [gemma.ts](../../hub/src/explain/gemma.ts)) pass it to the prompt.
- [web/src/App.tsx](../../web/src/App.tsx): the phone model follows the same rule with keyword matching's verdict.
- Tests: new [hub/test/answer.test.ts](../../hub/test/answer.test.ts), more cases in [shared/test/prompt.test.ts](../../shared/test/prompt.test.ts), and a real-model "not sure" case in [hub/test/gemma-llamacpp.test.ts](../../hub/test/gemma-llamacpp.test.ts).
- [README.md](../../README.md): new section "How matching and Gemma split the work".

## Decisions
- Laya has no abstain option and Gemma used to judge the match itself ("if no note clearly matches..."). That made two judges. Now only the matcher judges, through its confidence gate, and Gemma follows the verdict.
- A sure match sends only the top note, so Gemma cannot drift to the runner-up. A match that is not sure sends the candidates, so Gemma can help the farmer tell them apart.
- No match skips Gemma. It would only repeat the phone's own no-match line, and it would cost about 1 s.
- The verdict goes in the user message, so the llama.cpp cached system prompt stays the same.
- The API shape (`AskResponse`) is unchanged. A skipped explanation reports `unavailable`.

## Verification
- `pnpm build`: passed.
- `pnpm test`: shared 50, web 29, hub 74 passed. The real Laya and Gemma GGUF tests ran because `hub/.env` sets both paths.
- Built hub with `HUB_MATCHER=hybrid`, `HUB_EXPLAINER=gemma` on 127.0.0.1:8811, 4 questions. Two were sure (rice-blast, bph); Gemma explained the one problem each. Two were not sure (bacterial-leaf-blight/stem-borer, fall-armyworm/downy-mildew); Gemma began with "Hindi ako sigurado", listed the telling signs, and pointed to the agriculturist or DA technician. About 1.2 to 1.4 s from match to explanation. The test hub was stopped afterwards.
- Not run: the phone AI path in a browser, the ONNX Gemma route with the new prompt (its test file was updated and passed), `pnpm eval` (matching did not change).

## Follow-ups
- With hybrid, Laya always returns candidates, so "no match" now happens only on keyword-only hubs or an empty crop pool.
- Not committed. A staged `.gitignore` change in the tree is not from this task.
- Related: [[2026-10-09-gemma-llamacpp-speed]], [[2026-10-09-laya-option-text-fix]], [[2026-10-09-laya-webgpu-speed]].
