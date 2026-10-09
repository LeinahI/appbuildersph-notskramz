# Gemini chat sidebar + auth-gated /chat

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Add Gemini-style conversation sidebar with CRUD + Dexie/ws sync; gate `/chat` behind farmer claim JWT; make `/` unified admin/farmer login.

## What changed
- ws: migration [000003_conversations.sql](../../ws/internal/database/migrations/000003_conversations.sql), domain/application/HTTP for conversations, `UserAuth` middleware
- web Dexie v2 + [conversations.ts](../../web/src/lib/conversations.ts) sync with farmer Bearer
- Routes: `/` login, `/chat` + [ConversationSidebar](../../web/src/components/ConversationSidebar.tsx), claim → `/chat`
- Docs: AGENTS.md, README

## Decisions
- Farmer auth remains claim JWT (no password). Login farmer tab continues if linked.
- Full thread saved via PUT replace messages after each turn.
- Local Dexie is primary UX; remote merge updates titles/pins.

## Verification
- `go test ./internal/domain/conversation/...`: passed
- `make migrate-up`: applied 000003
- `pnpm exec tsc --noEmit` in web: passed
- Restarted `ws` API; `/up` ok

## Follow-ups
- Manual E2E: claim → `/chat` → new/pin/rename/delete → confirm Postgres rows
