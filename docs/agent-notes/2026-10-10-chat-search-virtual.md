# Gemini-style chat search + virtualized threads

- Date: 2026-10-10
- Agent: Auto (Composer)
- Status: done

## Task
Add `/search` for local chat search with keyword highlight, open chat scrolled to the matching turn, and virtualize search results + chat thread with TanStack Query/Virtual.

## What changed
- Added `@tanstack/react-query` and `@tanstack/react-virtual`; [web/src/main.tsx](../../web/src/main.tsx) wraps routes in `QueryClientProvider` and registers `/search`
- [web/src/lib/search-chats.ts](../../web/src/lib/search-chats.ts) — Dexie recent list + keyword hits over title/question/answer; highlight/snippet helpers
- [web/src/pages/SearchChatsPage.tsx](../../web/src/pages/SearchChatsPage.tsx) — virtualized Recent/Results UI
- [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx) — Search chats navigates to `/search` (inline title filter removed)
- [web/src/App.tsx](../../web/src/App.tsx) — messages via Query; virtualized thread; `?m=&q=` scroll-to-match + highlight
- Labels + [web/test/search-chats.test.ts](../../web/test/search-chats.test.ts)

## Decisions
Offline Dexie is search authority (no new `ws` FTS). Query caches Dexie reads; Virtual renders viewport rows only. Ugatan light tokens, not Gemini dark theme.

## Verification
`pnpm --filter @ugatan/web test`: 209 passed. `web` `tsc --noEmit`: passed.

## Follow-ups
Remote-only conversations (title from pull, no local questions) only match on title until messages exist on the phone.
