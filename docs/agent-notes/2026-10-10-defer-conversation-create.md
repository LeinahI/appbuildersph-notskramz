# Defer conversation create until first message

- Date: 2026-10-10
- Agent: Auto (Composer)
- Status: done

## Task
Stop creating empty conversations when the farmer clicks New chat / +; create local + remote only on the first message.

## What changed
- [web/src/lib/conversations.ts](../../web/src/lib/conversations.ts) — removed eager `syncCreate`; `ensureActiveConversation` / `resolveConversation` return `null` for draft; `saveConversationThread` skips remote create/PUT when there are no questions
- [web/src/App.tsx](../../web/src/App.tsx) — New chat navigates to draft `/chat`; first `ask` creates the row then continues; delete of last chat returns to draft
- [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx) — New chat calls `onNewChat` only (no IndexedDB write)
- [web/test/conversations-defer.test.ts](../../web/test/conversations-defer.test.ts) — coverage for deferred remote create and null resolve

## Decisions
Frontend-only: backend already creates on first non-empty `saveConversationThread`. Draft means no local sidebar row until the farmer sends a message (typed or symptom chip).

## Verification
`pnpm --filter @ugatan/web test`: 204 passed. `web` `tsc --noEmit`: passed. No `ws/` changes.

## Follow-ups
Existing empty "Bagong usapan" rows already in Postgres/local are not cleaned up; farmers can delete them from the sidebar.
