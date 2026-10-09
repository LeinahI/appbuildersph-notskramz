# Chat conversation deep-link URLs

- Date: 2026-10-10
- Agent: fullstack-developer (Composer)
- Status: done

## Task
Give each farmer chat its own URL with the Dexie conversation UUID (`/chat/:conversationId`), so sidebar switches and new chats update the address bar like Gemini/Claude.

## What changed
- [web/src/main.tsx](../../web/src/main.tsx) — route is now `/chat/:conversationId?`
- [web/src/App.tsx](../../web/src/App.tsx) — loads from `useParams`, navigates on select/new/delete; bare or unknown id replace-redirects via `resolveConversation`
- [web/src/lib/conversations.ts](../../web/src/lib/conversations.ts) — added `chatHref` and `resolveConversation` (reuse `ensureActiveConversation` fallback)
- [web/src/pages/ClaimPage.tsx](../../web/src/pages/ClaimPage.tsx), [web/src/pages/LoginPage.tsx](../../web/src/pages/LoginPage.tsx) — post-auth links use `chatHref()`
- [web/test/conversations-href.test.ts](../../web/test/conversations-href.test.ts) — small check for `chatHref`
- [README.md](../../README.md), [AGENTS.md](../../AGENTS.md) — document `/chat/:conversationId`
- No `ws/` changes

## Decisions
URL uses the local Dexie conversation `id` (already a UUID). Optional route param keeps one component; bare `/chat` and bad ids fall through the existing ensure-active pattern with `replace` navigation so history stays clean.

## Verification
- `pnpm --filter @ugatan/web exec tsc --noEmit`: passed
- `pnpm --filter @ugatan/web test`: 138 passed
- Browser deep-link click-through not run in this session

## Follow-ups
None required. Cross-device links via Postgres `remoteId` would need a lookup path; out of scope.
