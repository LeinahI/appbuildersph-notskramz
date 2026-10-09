# Photo recognition: a form built from the knowledge base

- Date: 2026-10-09
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done

## Task
A farmer sent a photo of corn with fall armyworm damage and "ano ang mali". The vision model wrote "white spots and holes… somewhat wilted" and named no plant. The matcher offered rice caseworm or fall armyworm and was not sure, and the reply came back in English. Fix photo recognition, and base it on all the plants and problems in this project.

## What changed
- New [shared/src/photo-form.ts](../../shared/src/photo-form.ts): `PHOTO_FORM` is a list of choices covering every rice and corn problem in the knowledge base. It asks for the plant, holes or chewing, where the damage is, marks, spots, droppings, insects and eggs, dying or cut parts, mold, plant color, and grains. The vision model writes the plant and copies the signs it sees. `readPhotoForm` finds the choices anywhere in its answer, so the layout does not matter, and writes the description in the knowledge base's own keywords. "Another plant" counts only when no sign was listed.
- [shared/src/prompt.ts](../../shared/src/prompt.ts): `PHOTO_SYSTEM_PROMPT` asks for the form and says how corn and rice look. The explainer gets the farmer's words and the photo's English signs on separate lines (`photo` option) and replies in the farmer's language.
- [hub/src/explain/multimodal.ts](../../hub/src/explain/multimodal.ts): turns the form answer into the description, "not rice or corn", or no signs. An answer that is not a form is read as free text, as before.
- [hub/src/answer.ts](../../hub/src/answer.ts), [hub/src/explain/index.ts](../../hub/src/explain/index.ts), [gemma.ts](../../hub/src/explain/gemma.ts), [gemma-llamacpp.ts](../../hub/src/explain/gemma-llamacpp.ts): pass the photo signs apart from the farmer's words. The chat reply sees them as a marked English note.
- [knowledge/fall-armyworm.json](../../knowledge/fall-armyworm.json): added keywords for its early sign, scraped "window-pane" patches.
- `VISION_MAX_NEW_TOKENS` defaults to 128 ([hub/src/config.ts](../../hub/src/config.ts), [.env.example](../../hub/.env.example), [README.md](../../README.md)).
- Tests: new [shared/test/photo-form.test.ts](../../shared/test/photo-form.test.ts). It checks that every knowledge entry can be reached from a choice, that no choice names a pest, and that answers are read whatever the layout. [shared/test/prompt.test.ts](../../shared/test/prompt.test.ts) and [hub/test/config.test.ts](../../hub/test/config.test.ts) are updated.

## Decisions
- A form, not wording rules: with free text plus rules, and then with a checklist of all 53 knowledge signs, the E2B vision model still wrote "white spots" and "small holes", which no keyword knows. Picking from choices worked.
- A numbered form failed: the model put every answer on one line. So the answer is read by phrase, not by line number.
- The description is written by the app, in the knowledge base's keywords. A photo then matches like a typed report, and the photo step still names no pest.

## Verification
- On the user's photo (cut from their screenshot at 420x564), through the real hub pipeline: vision "Corn plant. White see-through streaks, scraped patches where the leaf surface was eaten." The match was fall armyworm (sure). The reply was in Tagalog, named the problem, and gave its steps. Before: no plant named, rice caseworm or fall armyworm (not sure), reply in English.
- Shared tests: 250 passed. Hub tests other than the real-model ones: 174 passed. Web typecheck: passed.
- Photo read time was 64 to 158 s on the shared CPU while other sessions ran models.
- Not tried: other photos (rice, other pests, non-plants), and the browser.

## Follow-ups
- Test the form on a set of real photos of each problem, and on non-plant photos.
- The choices were written by hand from the knowledge signs. When a knowledge entry is added, its signs need a choice, or the reachability test fails.

Related: [[2026-10-09-photo-recognition]], [[2026-10-09-chat-behaviour-20-chats]]
