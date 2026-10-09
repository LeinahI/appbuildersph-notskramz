# Chat behaviour: stress-test review and 20-chat fix loop

- Date: 2026-10-09
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done

## Task
Read the chat messages from the stress run and improve how the chat behaves. Then ask 20 questions of each kind (20 chats of 16 messages, 320 in all) through the real hub, and fix each chat's problems as it finishes.

## What changed
- [shared/src/conversation.ts](../../shared/src/conversation.ts)
  - `fixedReply`: fixed lines that never go to the model. Covers pesticide, brand, and dose asks; health asks; poisoning, snakebite, and pesticide exposure (health center or 911, or a vet for an animal); "where is the hospital"; office questions (complaints, land, loans, RSBSA, ayuda, municipyo, sent to the MAO); planting, harvest, fertilizer, and watering (sent to the agriculturist, since the model made up advice); other crops (Tagalog, English, Cebuano names); "is it safe to eat"; identity; thanks and goodbye (no question); "ok" and "sige"; keyboard mashing; and "may tanong ako".
  - `isAboutLastAnswer` and `isQuestionWithoutSign`: after a named problem, a question or a short detail ("ano ang gagawin ko?", "sa tangkay din po") is answered from that problem's notes, not matched again. A question with no sign is never re-matched on open notes.
  - `notesForMatch`: naming the other crop starts a new problem.
  - `withProblemName`: a sure answer or a best guess always says the problem's name.
  - Routing: another crop wins over a rice keyword ("itim na batik ang mangga"). A pesticide question that names a pest gets the pesticide line. More complaint, farewell, identity, and interjection words. "Kalahati" and "karamihan" count as urgent. The echo checker ignores crop words and word forms. `TurnOutcome` has "done", which resets the follow-up count after a final answer.
- [shared/src/prompt.ts](../../shared/src/prompt.ts): The explainer names the problem first, mentions only signs the farmer described, and uses a Tagalog word list (uhay, ubod ng mais, patay na usbong, hugis diyamante...). The chat gets `unmatched` (the "could not match" wording only for unmatched signs) and `diagnosis` (the last named problem's notes, with rules: say "not sure" for harvest, eating, or time; never guess yes or no; on a complaint, ask what does not fit). With one candidate, the not-sure question asks about another of its signs.
- [hub/src/conversation/state.ts](../../hub/src/conversation/state.ts): the session keeps `lastMatch`. A clear match or a final answer empties the notes.
- [hub/src/answer.ts](../../hub/src/answer.ts): uses all of the above. A small-talk reply that breaks the guardrail gets the app's own line instead of nothing.
- [hub/src/explain/index.ts](../../hub/src/explain/index.ts), [gemma.ts](../../hub/src/explain/gemma.ts), [gemma-llamacpp.ts](../../hub/src/explain/gemma-llamacpp.ts): pass the new chat options.
- [web/src/App.tsx](../../web/src/App.tsx): the phone matches only notes after the last clear match, uses fixed replies before its own model, and names the problem.
- Tests: new cases in [shared/test/conversation.test.ts](../../shared/test/conversation.test.ts), [shared/test/prompt.test.ts](../../shared/test/prompt.test.ts), [hub/test/conversation.test.ts](../../hub/test/conversation.test.ts). Updated expectations in [hub/test/answer.test.ts](../../hub/test/answer.test.ts) and [hub/test/conversation-safety.test.ts](../../hub/test/conversation-safety.test.ts).

## Decisions
- Fixed lines for safety and fact questions (pesticide, health, office, growing, eating) instead of prompt rules. The 2B model kept inventing facts there ("keep the soil dry" for paddy rice, "Opo, may ayuda", "hindi pa po panahon anihin").
- Greetings, help, complaints, and general off-topic questions stay with the model, because its replies were good and a fixed line felt stiff.
- A clear match closes the problem. The old notes were mixed into new signs and gave wrong diagnoses ("may kuhol sa palayan" came back as corn borer).
- "kape" and "gabi" were removed from the other-crop list: the knowledge base uses "kulay kape" (brown) and "sa gabi" (at night).

## Verification
- First 20-chat run (old code, real Laya and Gemma, 320 messages, 64 min): read every reply and fixed after each chat. Before and after counts are below.
- `pnpm --filter @ugatan/shared build` and the hub build: passed.
- Shared tests: 242 passed. Hub tests other than the real-model ones: 158 passed. 12 failed, all "labeled examples" for the 12 new knowledge entries another session is adding; those are not chat code. Web typecheck: passed. Web tests: 33 passed (run before the 20-chat loop).
- Not run: the real-model Gemma and Laya test files, and the browser.

## Follow-ups
- Matcher coverage for phrasings like "may uod sa gitna ng mais" and "may sawdust sa butas ng tangkay ng mais" (matched fall armyworm, not corn borer) needs the agronomist.
- Fixed lines are in Tagalog only. An English or Cebuano farmer gets Tagalog for those.
- Another session was editing the same files during this work (photo, rails, new knowledge entries). Their rails test and examples were in progress.
