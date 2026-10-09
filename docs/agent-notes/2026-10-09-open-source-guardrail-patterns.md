# Open-source guardrail patterns

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Look at how other open-source AI projects behave and bring the useful parts into Ugatan.

## What changed
- Research: web search only, nothing downloaded or installed. Sources: the NVIDIA NeMo Guardrails docs (input rails, jailbreak heuristics, grounding fact-check rail), the Llama Guard paper (arXiv 2312.06674, safety categories checked on both input and output), and Meta's Prompt Guard and LlamaFirewall pages. A search on Digital Green's Farmer.Chat found that its safeguard is mostly curated sources plus human review, with no code details, so nothing was copied from it.
- New [shared/src/rails.ts](../../shared/src/rails.ts): `isInjectionAttempt` (input rail, English and Tagalog), `INJECTION_REPLY`, and `ungroundedProblems` (output rail).
- [shared/src/conversation.ts](../../shared/src/conversation.ts): `routeFor` sends an injection to the chat, and `fixedReply` answers it with a fixed line.
- [shared/src/guard.ts](../../shared/src/guard.ts): more dose wording (caps, drops, cups, sachets, ppm, "kada tangke").
- [shared/src/prompt.ts](../../shared/src/prompt.ts): the answer, chat, and describe prompts say the farmer's message is data, not orders.
- [hub/src/answer.ts](../../hub/src/answer.ts): an injection skips the photo, the picked symptom, and the matcher. A reply that names a problem it was not given notes for gets status `blocked`, with a `guardrail` log event ([hub/src/log.ts](../../hub/src/log.ts)).
- [web/src/App.tsx](../../web/src/App.tsx): the phone model's reply goes through the same grounding check.
- Tests: [shared/test/rails.test.ts](../../shared/test/rails.test.ts) and three cases at the end of [hub/test/conversation-safety.test.ts](../../hub/test/conversation-safety.test.ts).
- README: new "Guardrail rails" section.
- Follow-up fix from a chat screenshot: "magandang itanim na seed sa klimang tag init" and "hindi ito problema... magandang pananim sa klimang tag init" got a downy-mildew-style "not sure" reply. The crop-care rule (`CROP_CARE` in [shared/src/conversation.ts](../../shared/src/conversation.ts)) now also covers seed, buto, klima, tag init, tag ulan, summer, "magandang pananim", "anong itanim", and "what to plant", so these get the fixed "pests and diseases only, ask the agriculturist" reply. Bare "pananim" is left out on purpose, because farmers use it in symptom reports. Test added in [shared/test/conversation.test.ts](../../shared/test/conversation.test.ts). With the current source the first message already routed to the chat; the screenshot's reply came from a hub or phone build older than the source.

## Decisions
- Used plain rules, not an extra classifier model (Llama Guard, Prompt Guard). A classifier is another download the phone cannot carry, and phrase rules are what NeMo's heuristic check does too. They are easy to evade, so they are a first layer, not the only one.
- The grounding check is name-based (the problem's short name in the reply), not an LLM judge. It is cheap and cannot itself hallucinate. It misses a wrong problem described without its name.
- A blocked reply falls back to the curated notes, the same path as a pesticide violation.

## Verification
- `pnpm -r build`: shared and hub built. Web `tsc` fails in `web/src/components/VoiceInput.tsx(136)` (`Cannot find name 'L'`), a file with uncommitted changes from other work that I did not touch.
- `vitest run` in `shared/`: 210 passed (after the crop-care fix).
- Web tests (`vitest run` in `web/`): 96 passed.
- Hub: my 3 new tests pass. Failures that also occur with my two hooks in `hub/src/answer.ts` switched off, so they are not from this change: 3 in `hub/test/conversation.test.ts` (follow-up counts, `withProblemName` prefix), 1 in `conversation-safety.test.ts` (off-topic reklamo case), and 1 in `server.test.ts` (`bph` not matched from its own keywords, while other work edits `knowledge/bph.json` and adds new entries). Two real-model Gemma tests also timed out in the full run (40 to 60 s each). I did not get a clean summary line for the full hub suite; an earlier full run (before the test edits) reported 3 failed files, 2 failed tests.
- Not run: `pnpm eval`, any real Gemma or phone run.

## Follow-ups
- Fix the failing hub tests and the `VoiceInput.tsx` type error (other work in progress).
- Add Cebuano phrases to the injection rule and have a native speaker check them.
- Not adopted: NeMo's SelfCheckGPT-style hallucination check, which samples extra model answers. It would multiply Gemma's time on the hub.
