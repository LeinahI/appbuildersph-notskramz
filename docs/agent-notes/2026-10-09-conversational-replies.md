# Conversational replies when nothing matches

- Date: 2026-10-09
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done

## Task
The farmer typed "hey" and "bat ganyan response mo. ayusin mo. kausapin mo ako". The app answered with Downy mildew / Rice blast and then the canned "Walang malinaw na tugma" line. Make the reply respond to what the farmer actually said.

## What changed
- [shared/src/prompt.ts](../../shared/src/prompt.ts): new `chatSystemPrompt` and `buildChatMessages(question, history)`. Gemma replies in the farmer's language, greets back, apologizes for a bad answer, asks what they see, and never names a problem, a brand, or a dosage. `ChatMessage` now allows `assistant`.
- [shared/src/api.ts](../../shared/src/api.ts): `AskRequest.history` (optional `ChatTurn[]`, oldest first). The hub keeps the last 4 turns ([hub/src/answer.ts](../../hub/src/answer.ts) `parseAskRequest`).
- [hub/src/matchers/hybrid.ts](../../hub/src/matchers/hybrid.ts): when Gemma's describe step says "No signs.", nothing is matched (`noSigns: true`). Before, Laya ran on the raw words and picked a disease for "hey".
- [hub/src/answer.ts](../../hub/src/answer.ts): with no match, the hub calls `explainer.chat` instead of skipping Gemma. The reply goes through the same pesticide guardrail. Logged as `chat-ok` / `chat-blocked`; no escalation is logged for "no signs".
- [hub/src/explain/gemma-llamacpp.ts](../../hub/src/explain/gemma-llamacpp.ts) and [gemma.ts](../../hub/src/explain/gemma.ts): `chat()` added. llama.cpp gets a third context sequence for the chat session.
- Web: [App.tsx](../../web/src/App.tsx) stores the last 4 turns on each question and sends them to the hub ([sync.ts](../../web/src/lib/sync.ts)). With no keyword match and no hub, the phone model replies with the chat prompt. [AnswerView.tsx](../../web/src/components/AnswerView.tsx) hides the "Walang malinaw na tugma" banner when a reply is shown or while it is being written. The source label reads "Gemma sa hub" for a chat reply.

## Decisions
The matcher still decides every diagnosis. The chat reply only runs when there is no match, so Gemma never picks a problem. History is clipped (4 turns, 400 chars per turn) to fit the 2048-token context.

## Verification
- `pnpm build`: passed. `pnpm test`: shared 57, web 29, hub 92 passed. New tests cover chat with history, a guardrail block on a chat reply, history parsing, the hybrid "no signs" case, and `buildChatMessages`.
- Ran the real Gemma 4 E2B GGUF from a scratch script: "hey" got "Hello! Kumusta ang palay at mais ninyo? Ano po ang nakikita ninyo sa mga tanim?". The complaint got an apology and a question about color, spots, and insects. Cebuano got a Cebuano greeting.
- Did not restart the running hub on port 8787 or click through the web app.

## Follow-ups
- Restart the hub to pick up the change.
- Matched answers (explain path) do not use chat history yet.
