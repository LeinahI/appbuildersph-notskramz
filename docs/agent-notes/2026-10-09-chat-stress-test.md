# Chat stress test and fixes

- Date: 2026-10-09
- Agent: Claude Haiku 5.5 (Claude Code)
- Status: partial (the 5000-turn run on the fixed code is still in progress when this note is written)

## Task
Ask the Ugatan chat many varied questions through the real hub pipeline, then fix what the answers got wrong.

## What changed
- [shared/src/conversation.ts](../../shared/src/conversation.ts): small talk covers "may tanong", identity, insults, and interjections. Off-topic questions (other crops, health, prices, time, legal, pesticide dose asks) go to the chat. Echo questions are dropped. A complaint gets a sorry in front. A field-going-bad message gets "call the agriculturist now".
- [shared/src/guard.ts](../../shared/src/guard.ts): dosage check counts number words and spelled-out units; brand list has the standard isoprothiolane and lambda cyhalothrin spellings, plus diazinon, dimethoate, triazophos.
- [shared/src/prompt.ts](../../shared/src/prompt.ts): chat prompt treats notes as context only, forbids repeating the farmer as a question, and gives short examples. The chat message names the crop.
- [hub/src/conversation/state.ts](../../hub/src/conversation/state.ts): requests for one chat run one at a time, and a retried request id gets the same answer.
- [hub/src/answer.ts](../../hub/src/answer.ts): a tapped symptom picture is taken as the match. The crop reaches the chat reply.
- [web/src/lib/sync.ts](../../web/src/lib/sync.ts): sends the tapped symptom id. [web/src/App.tsx](../../web/src/App.tsx): the phone's chat gets the crop. [web/src/config/labels.ts](../../web/src/config/labels.ts): blocked replies say to consult the agriculturist.

## Decisions
- Off-topic routing is a word list, not a model call: deterministic and offline. The cost is that a farm question worded with an off-topic word goes to the chat instead of the matcher.
- The retry cache answers a repeated request id from memory, so a phone retry is not counted as a second question.
- The per-chat queue serializes requests for one chat only. Other chats are not held up.
- Symptom coverage (about a quarter of symptom phrasings did not match in the 3000-turn run) is a knowledge question for the agronomist. It is not changed here.

## Verification
- `pnpm -r build`: passed.
- Shared tests: 122 passed. Hub fast tests: 97 passed. Web tests: 33 passed.
- Real-model tests (`hub/test/gemma-llamacpp.test.ts`): 10 of 11 passed. The one failure is the latency check (10.6 s against 10 s). The GPU was shared with another hub dev server, so this is environmental, not a logic failure.
- The 3000-turn stress run before the fixes is in the scratchpad (`stress-60pct.jsonl`, `report-60pct.txt`). The full 5000-turn run on the fixed code was started on the same seed.
- Not run: the browser checks. The BrowserSkill daemon was running on 127.0.0.1:47800 while the panel expected 52800, and this session had no BrowserSkill tool, so in-browser checks were blocked.

## Follow-ups
- Symptom keyword coverage for phrasings like "may uod sa gitna ng mais" needs agronomist review.
- Off-topic and small-talk word lists are heuristics. Watch the stress run for false routing.
- The docs/BUSINESS-PLAN.md and docs/DEMO.md still describe the notice on every answer.
