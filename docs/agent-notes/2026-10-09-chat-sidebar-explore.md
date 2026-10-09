# Explore farmer chat for Gemini-style sidebar

- Date: 2026-10-09
- Agent: Composer (file-search subagent)
- Status: done

## Task

Read-only map of farmer chat, claim/auth, and whether `ws/` has conversation APIs — for planning a Gemini-style chat history sidebar for authenticated farmers.

## What changed

- No code changes
- Findings: chat is local-only (Dexie + `chatFrom` cursor + `sessionId`); claim JWT stored but does not gate `/`; `ws/` has users/invites/audit/products only; no sidebar UI; hub keeps in-memory sessions by `sessionId`

## Decisions

Research only; no implementation.

## Verification

Read `web/src/App.tsx`, `db.ts`, `ClaimPage.tsx`, `config/ws.ts`, `ws-api.ts`, `sync.ts`, `main.tsx`, `ws` router + migration `000002`, hub `conversation/state.ts`. No build/test.

## Follow-ups

Sidebar needs a real multi-session model (Dexie `sessionId` index or chats table); optional auth gate via `loadClaimLink()`; server sync would need new `ws` tables/APIs.
