# Claude-style chat UI, answers from Laya and Gemma

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Make the web UI look like the Claude chat screen, make the reply come from the Laya match and Gemma's explanation instead of canned text, and remove the crop (palay/mais) picker.

## What changed
- [web/src/App.tsx](../../web/src/App.tsx): chat thread (user bubble, then answer), composer pinned at the bottom (Enter sends), greeting screen with symptom chips when empty, settings in a dialog. No crop picker: every question goes out with crop `any`, and the question's own words decide.
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx): Gemma's explanation is the reply, with a line naming the models ("Keyword/Laya + Gemma sa hub" or "Gemma sa device"). The curated notes sit in a collapsible "Tugma" block behind it. While Gemma is working (phone or hub) the reply shows typing dots and the keyword notes wait. The keyword notes show open, labelled "Offline na tala (keyword)", only when there is no model reply.
- **Bagong usapan** button in the header (shows once a chat has messages). It starts an empty chat by remembering the last question id in localStorage (`ugatan.chatFrom`); nothing is deleted, and queued questions still sync to the hub.
- New [web/src/components/SettingsDialog.tsx](../../web/src/components/SettingsDialog.tsx) (phone AI, hub address). Removed `QueueList.tsx`; the thread is the history.
- [web/src/index.css](../../web/src/index.css): warm Claude palette, serif answers, dark mode follows the device. Unused labels removed from [web/src/config/labels.ts](../../web/src/config/labels.ts).
- Guardrail in `shared/` untouched. The disclaimer is still the last line of every answer.

## Decisions
- Kept the keyword notes as an offline fallback and as collapsed reference, because the app must still work with no hub and no phone AI.
- Crop is fixed to `any` rather than guessed, since the hub accepts it and the matcher reads the crop from the text.

## Verification
- `pnpm --filter @ugatan/web build`: passed. `pnpm --filter @ugatan/web test`: 29 passed.
- `curl` to the hub on 8787 (hybrid + Gemma) with crop `any`: returned the right match and a Taglish explanation for a rice and a corn question.
- Browser, after the new-chat change: sent a rice question through the UI and got Gemma's explanation with "Keyword/Laya + Gemma sa hub" and the disclaimer last. "Bagong usapan" cleared the thread, and the empty chat survived a reload. Layout was not inspected by screenshot at full size or on a phone. Not run: hub tests, `pnpm test` at the root.

## Follow-ups
- Look at the answer layout in a browser, light and dark, phone width. There is no list of past chats yet, only a fresh start.
- The hub and the phone's Gemma sometimes quote the English notes inside Taglish text; the notes are not translated yet.
