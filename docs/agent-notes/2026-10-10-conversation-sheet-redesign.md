# Conversation history redesigned as a bottom sheet

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Apply the pasted UX brief to the "Mga usapan" dialog: bottom sheet, real empty state with quick starts, grouped and searchable list, quieter privacy note, animations. Follow-up to [[2026-10-10-conversation-dialog-ui]].

## What changed
- [web/src/components/ConversationDialog.tsx](../../web/src/components/ConversationDialog.tsx): now a bottom sheet on phones (drag-handle look, tap the dimmed area to close) and a centered card from `sm` up. Search field appears only when there are saved questions. Empty state has an icon, headline, helper text and three quick-start chips. Privacy text is a small shield footer. Search clears when the sheet closes.
- [web/src/components/QueueList.tsx](../../web/src/components/QueueList.tsx): rows show a thumbnail (the plant photo if there is one, else a chat icon), a 2-line question, time and a status pill. Removed the repeated "1 tanong · Naka-save sa device" line.
- [web/src/lib/history-groups.ts](../../web/src/lib/history-groups.ts): groups Today / Yesterday / Earlier, newest first, plus text filter. History is now newest first (was storage order).
- [web/src/index.css](../../web/src/index.css): `.chat-sheet*` styles, open and close animation with `@starting-style` and `allow-discrete` (off under reduced motion).
- [web/src/config/labels.ts](../../web/src/config/labels.ts): new `history*` labels in tl, en and ceb (the `historySaved` label is gone); `Labels` type now keeps string arrays.
- [web/src/App.tsx](../../web/src/App.tsx): `onQuickStart` closes the sheet, starts a new chat and fills the composer.
- Tests: updated dialog and queue-list tests, added [web/test/history-groups.test.ts](../../web/test/history-groups.test.ts).

## Decisions
- Swipe-to-delete and rename were left out: this list holds the questions of the open chat, which have no delete or rename in the data layer. Chat delete and rename already live in the sidebar. Adding them here would need new Dexie operations.
- Quick-start chips only prefill the composer; the farmer still presses send.
- Cebuano texts are my own wording and have not been checked by a speaker.

## Verification
- `tsc --noEmit`: clean. `vitest run` in web: 279 passed. `pnpm --filter @ugatan/web build`: passed.
- Dev server at 375px: empty state, chip prefill, one saved question under "Ngayon", search no-match and match, backdrop close, no console errors. Screenshots checked for empty and populated states. The open animation was not judged by eye (the hidden window froze frames).
- Not run: Android APK build, desktop-width visual check of the centered card, swipe actions (not built).

## Follow-ups
- Decide whether swipe delete or rename belongs here; it needs data-layer work.
- Have a Cebuano speaker check the new labels.
