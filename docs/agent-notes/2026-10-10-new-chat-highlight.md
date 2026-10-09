# New chat highlight only on draft

- Date: 2026-10-10
- Agent: Auto (Composer)
- Status: done

## Task
New chat button should not look selected when viewing a conversation with a UUID.

## What changed
- [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx) — `bg-soft` on New chat only when `!activeId` (draft `/chat`)
- [web/src/App.tsx](../../web/src/App.tsx) — sidebar `activeId` is `conversationId` only (no localStorage fallback that kept a prior chat highlighted on draft)

## Decisions
The button always had `bg-soft`, so it looked permanently selected. Mirror conversation-row selection: highlight New chat only in draft mode.

## Verification
Visual class change only; did not re-run the full web suite for this tweak.

## Follow-ups
None.
