# Explore farmer QR claim and chat sidebar

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Map `/claim`, claim API client, ConversationSidebar empty bottom, IndexedDB chats, and ws ClaimInvite (JWT / pending→active). Note gaps for claim→/chat, farmer name, rename, logout.

## What changed
- No code changes
- Findings:
  - [web/src/main.tsx](../../web/src/main.tsx): `/claim` → `<Navigate to="/" replace />` (browser landing; native `/` → setup or `/chat`)
  - No `ClaimPage`; no `POST /api/v1/invites/claim` client in web; no farmer JWT storage
  - Sidebar: [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx) — flex column; list is `flex-1`; bottom footer empty (no name/logout)
  - Chats: Dexie DB `ugatan` in [web/src/lib/db.ts](../../web/src/lib/db.ts) + [web/src/lib/conversations.ts](../../web/src/lib/conversations.ts); no farmer session
  - ws claim: `POST /api/v1/invites/claim` → `{ data: { userId, token } }`; role `user`; `pending`→`active` via `MarkClaimed`

## Decisions
Research only; gaps left for a follow-up implementation PR.

## Verification
Code search/read only; tests not run.

## Follow-ups
Wire ClaimPage (`?token=` → claim → store JWT → `/chat`); sidebar footer with farmer name + logout; optional profile rename (chat title rename already exists).
