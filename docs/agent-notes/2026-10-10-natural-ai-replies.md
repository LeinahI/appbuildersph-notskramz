# Natural, accurate AI replies for palay, in Tagalog, Bisaya, and English

- Date: 2026-10-10
- Agent: Claude Opus 5.5
- Status: done

## Task
The chat answered like a form: it asked the same question again and again, asked about the leaf after the farmer said "uhay", ignored "ano po pwedeng gawin ko", and refused growing questions. The user asked for natural replies that answer what was asked, step-by-step guides, a real AI for palay, Bisaya (Cebuano) support, accurate answers, a Claude-like answer style, and a round of made-up questions to tune the replies.

## What changed
- [shared/src/guides.ts](../../shared/src/guides.ts) (new): 12 curated palay guides (planting overview, seed, seedbed, land prep, transplanting, water/AWD, fertilizer timing, weeds, harvest, drying and storage, rats, field scouting), each in English, Tagalog, and Cebuano. Timing and method only: no pesticide names, doses, or fertilizer amounts (amounts go to the soil test, leaf color chart, Rice Crop Manager, or MAO). Sources: PhilRice PalayCheck and Rice Production Manual, IRRI Rice Knowledge Bank. Not yet reviewed by an agronomist.
- [shared/src/language.ts](../../shared/src/language.ts) (new): tells English, Tagalog/Taglish, and Cebuano apart; the prompts get a "Reply language" line, and short messages ("oo") follow the farmer's last longer one.
- [shared/src/conversation.ts](../../shared/src/conversation.ts): `careGuideFor` routes how-to questions to a guide instead of the old fixed refusal (corn growing and "which crop" still go to the agriculturist). `isHelpAsk` ("ano gagawin ko", "pa help", "unsa akong buhaton"). `fitPlantPart` drops candidates that cannot show on the part the farmer named, and insects when they say "wala pong insekto". `signChoices` picks the "not sure" question's choices on that part, a different sign each time. `dropRepeatedQuestions` removes a question already asked in the chat. Every fixed and small-talk line has a Cebuano version. A sick person ("may sakit ang anak ko, anong gamot?") gets the doctor line, not the pesticide line. `tidyReply` can skip the "call now" line (a harvest how-to with "lahat ng butil" is not urgent).
- [shared/src/prompt.ts](../../shared/src/prompt.ts): a Claude-like style guide in both system prompts (answer first, short why, clean numbered steps, honest about uncertainty, one useful closing line, no filler). New verdict `MATCH_HELP` (likely problem + first steps + one confirming question). The explain prompt sees the last 3 turns. When steps are written, the note's reviewed Tagalog or Cebuano steps are included so the 2B model copies them instead of mistranslating. `chatGuide` with two worked examples of a direct first sentence. The chat may not give advice without a guide or notes.
- [hub/src/answer.ts](../../hub/src/answer.ts) and [web/src/App.tsx](../../web/src/App.tsx) (`answerOnPhone`): guide routing, help mode (matches the open notes, or the scouting guide when nothing matched), history to the explainer, plant-part filter, sign choices, repeated-question drop, problem name and no-model guide reply in the farmer's language. The phone path now also answers "ano ang gagawin ko?" from the problem it last named.
- [hub/src/explain/gemma-llamacpp.ts](../../hub/src/explain/gemma-llamacpp.ts): context 2048 to 4096, chat cap 120 to 160 tokens, guide or named-problem replies 420. [hub/src/config.ts](../../hub/src/config.ts): `GEMMA_MAX_NEW_TOKENS` default 128 to 320 and `GEMMA_MAX_WORDS` 70 to 130 (the old cap cut a best guess to one step). README and `hub/.env.example` updated.
- [knowledge/bph.json](../../knowledge/bph.json): farmer keywords for hopperburn ("kulay kalawang", "kulisap sa puno").
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx): a sure match shows only the top problem's card; the runner-up used to show as a second "Mataas na tugma" card.
- [eval/chat.ts](../../eval/chat.ts) and [eval/chat-questions.json](../../eval/chat-questions.json): `pnpm eval:chat` replays 20 made-up farmer chats through the hub with the real Gemma and Laya and prints every reply.
- Tests: new [shared/test/guides.test.ts](../../shared/test/guides.test.ts); updated prompt, conversation, hub answer, hub conversation, and config tests.

- Follow-up "make the app give the same replies": the web app calls the hub at 127.0.0.1:8787, which was running from the other checkout (`ugatan-phone-speed`). Stopped it and changed the `hub-8787` config in [.claude/launch.json](../../.claude/launch.json) to run this checkout with the same Gemma + Laya settings. Two fixes from checking the app: `withProblemName` writes "atangya (Rice bug)" instead of a second sentence naming the same problem, and `dropRepeatedSteps` removes numbered steps the farmer already got earlier in the chat (hub and phone).

## Decisions
- Kept Gemma 4 E2B on the phone and hub (offline in the field) and gave it Claude's answer style through the prompt, rather than calling a cloud model.
- Guides are curated, like the knowledge notes, so the model explains vetted steps and never guesses farm advice (the old reason for refusing growing questions).
- Copying reviewed Tagalog/Cebuano text fixed real mistranslations seen on the model ("malalim" for shallow water, "hayaang tumubo ang damo").
- The plant-part filter keeps the matcher's list when nothing fits, so it only narrows, never empties, except for an explicit "no insects".

## Verification
- `pnpm build`: passed. Shared 321 tests, web 323, hub 204 (without the model tests): passed.
- Hub model tests (`test/gemma-llamacpp.test.ts`, real GGUF): 10 of 11 pass. "answers two requests that arrive together" fails only in the full file run (passes alone, and with context 2048 too): greedy decoding on the GPU is not bit-exact with KV-cache prefix reuse on the new prompt. Left unchanged. The ONNX test hit "bad allocation" while another hub held the memory.
- Ran the made-up chats on the real model three times and tuned between runs; the screenshot chat now gives steps on "ano po pwedeng gawin ko" and never repeats a question.
- In the browser app (localhost:3000 on the new 8787 hub), the screenshot chat, a Tagalog how-to, and a Bisaya how-to all gave the new replies; after the last fix the 4th reply gives only the new step. Rebuilt the APK with `pnpm --filter @ugatan/web android:apk` (passed; the bundle contains the new guide and language code). Not installed or tested on a phone: no device was connected.

## Follow-ups
- Have an agronomist review `shared/src/guides.ts` (all three languages) and the Cebuano fixed lines.
- The matcher is still weak on vague words ("dilaw ang dahon" gives armyworm); a nutrient-deficiency note and more Tagalog/Cebuano keywords would help.
- The "arrive together" model test asserts exact text equality; consider asserting both succeed in order instead.
- Related: [[2026-10-10-diagnosis-card-redesign]].
