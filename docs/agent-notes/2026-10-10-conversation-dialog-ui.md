# Conversation dialog UI polish

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Improve the look of the "Mga usapan" (saved conversations) dialog shown in the user's screenshot.

## What changed
- [web/src/components/QueueList.tsx](../../web/src/components/QueueList.tsx): each saved question is now a bordered card with a date plus a colored status pill (answered = green, queued = amber), the question clamped to 2 lines, and the "saved on this device" hint as a small muted line. The empty state is a dashed soft panel.
- [web/src/components/ConversationDialog.tsx](../../web/src/components/ConversationDialog.tsx): pill-shaped "Bagong usapan" button, softer close button, and the privacy note in a tinted box with a phone icon.
- [web/src/index.css](../../web/src/index.css): new `chat-history-*` and `chat-status*` styles, thin themed scrollbar, slightly taller list.
- No text, label, or behavior changes.

## Decisions
- Kept the markup shape (`li` > `button`) and every label so existing tests and localization stay valid.
- Used CSS line-clamp, so long questions stay whole in the DOM and only the display is shortened.

## Verification
- `vitest run` on queue-list, conversation-dialog and home-page tests: 23 passed. `tsc --noEmit`: clean.
- Opened the dialog at 375px wide on the running dev server (localhost:3000), injected sample cards and checked computed styles: 2-line clamp, pill colors, and no horizontal overflow. Screenshots timed out (window hidden), so I did not visually inspect it.
- Did not run the full `pnpm test` or the Android build.

## Follow-ups
Look at the dialog once on the phone to confirm it looks right.
