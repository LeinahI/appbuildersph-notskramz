# Bare `/chat` stays a draft

- Date: 2026-10-10
- Agent: Auto (Composer / fullstack-developer)
- Status: done

## Task
Fix New chat / + reopening the previous conversation instead of staying on an empty draft `/chat`.

## What changed
- [web/src/lib/conversations.ts](../../web/src/lib/conversations.ts) — `resolveConversation` returns `null` immediately when the URL id is missing/empty; no longer calls `ensureActiveConversation` for bare `/chat`
- [web/test/conversations-defer.test.ts](../../web/test/conversations-defer.test.ts) — assert draft resolve stays null even when local chats exist
- [web/src/App.tsx](../../web/src/App.tsx) — `newChat()` clears active id and navigates to `/chat`; mount clears history when resolve returns draft `null`

## Decisions
Root cause was `resolveConversation(undefined)` falling through to last-active / latest local chat, which the mount effect then put back into the URL as `/chat/:uuid`. Login/claim `chatHref()` still deep-links when an active id is known. `ensureActiveConversation` remains for delete-fallback when other chats exist.

## Verification
`pnpm --filter @ugatan/web test`: 205 passed. Did not run full root `pnpm test` or `ws/` checks.

## Follow-ups
None.
