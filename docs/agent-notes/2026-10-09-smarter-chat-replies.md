# Smarter chat replies: crop from the chat, other crops, plain text

- Date: 2026-10-09
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done (another session was editing the same hub files at the end, see Follow-ups)

## Task
Follow-up to [[2026-10-09-conversational-replies]]. In the user's chat, "may butas po" after "may mali sa palay ko" matched corn pests. "kangkong po" and "pwede ba kangkong kainin?" got rice diseases. Replies showed raw `**bold**` and repeated "Hindi tiyak".

## What changed
- [shared/src/crop.ts](../../shared/src/crop.ts): `detectCrop` and `cropOfChat`. The newest message that names palay, humay, bigas, mais, or corn decides the crop. The hub ([hub/src/answer.ts](../../hub/src/answer.ts)) and the phone ([web/src/App.tsx](../../web/src/App.tsx)) match on that crop instead of `any`.
- [shared/src/prompt.ts](../../shared/src/prompt.ts):
  - Describe step: answers `OTHER_CROP` ("Not rice or corn.") for kangkong and other plants. Sign-free questions such as "pwede ba kainin?" get "No signs.". It keeps "rice" or "corn" in the English when the farmer names it.
  - Explain step: for a not-sure match it no longer repeats "Hindi tiyak, tawagan..." (the banner says it). It names the signs that tell the candidates apart and asks one question. Plain text only.
  - Chat step: declines other plants in one sentence and answers thanks or goodbye.
- [hub/src/matchers/hybrid.ts](../../hub/src/matchers/hybrid.ts): `OTHER_CROP` matches nothing, the same as `NO_SIGNS`, so the chat reply answers.
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx): `**bold**` is shown as bold, never as asterisks.
- Tests: [shared/test/crop.test.ts](../../shared/test/crop.test.ts), hybrid `OTHER_CROP`, the hub matching on the chat's crop, and real-model tests in [hub/test/gemma-llamacpp.test.ts](../../hub/test/gemma-llamacpp.test.ts). That file had a stray backspace byte in a regex, now replaced.

## Decisions
The crop rule is a word list, not a model call: deterministic, offline, and free. Other crops go to the chat, not to matching, because the knowledge base only covers rice and corn.

## Verification
- `pnpm test` (before the other session's edits): shared 60, web 29, hub 96 passed, including 8 real Gemma tests.
- Eval with `--describe` (hybrid + Gemma): paraphrase 31/31, holdout2 35/36, holdout 51/53 (was 52/53). Zero wrong in every set. The new holdout miss is a golden-apple-snail Taglish row that is now "not sure": Gemma wrote "pink clusters" instead of "eggs". The three "none" rows now get "No signs." instead of invented signs.
- Replayed the user's chat through the full pipeline. "hello" got a greeting. "may butas po" stayed on rice, not sure between rice blast and BLB, and asked a question. All three kangkong messages were declined politely. "salamat po" got "Walang anuman po".

## Follow-ups
- At the end, another session was editing [hub/src/answer.ts](../../hub/src/answer.ts) and the shared files (chat sessions, `matchedOn`). `pnpm build` failed on its unfinished `matchedOn` field. I did not touch that work.
- "may butas po" on rice still guesses leaf-spot diseases. The knowledge base has no rice entry for holes in leaves.
- Restart the hub on port 8787 to load the changes.
