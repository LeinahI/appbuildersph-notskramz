# Merge origin/main into the no-login Android work and push

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Commit the local Android / no-login work, merge `origin/main` (chat search, guardrails, deferred conversation create), resolve conflicts, push to `main`.

## What changed
- Committed the local work, then merged `origin/main` (5 commits behind) into `main`.
- Conflicts in [Home.md](../../Home.md), [web/src/App.tsx](../../web/src/App.tsx), [web/src/config/labels.ts](../../web/src/config/labels.ts), [web/src/lib/conversations.ts](../../web/src/lib/conversations.ts), [web/src/main.tsx](../../web/src/main.tsx), [web/test/app.test.tsx](../../web/test/app.test.tsx).
- Kept main's chat search (`/search`, TanStack Query), draft `/chat`, and shared delete confirm dialog. Kept our no-login rules: no farmer sign-in, no log out, no ws sync. `/search` is now a public route like `/chat`.
- Dropped main's `saveConversationThread` / `pullRemoteConversations` and farmer logout labels. Removed the matching ws-sync tests from [web/test/conversations-defer.test.ts](../../web/test/conversations-defer.test.ts).

## Decisions
Chats stay only in the phone's IndexedDB, so main's remote-sync code had no caller and was removed instead of kept dead.

## Verification
`pnpm build`: passed. `shared` tests: 268 passed. `web` tests: 211 passed. `hub` tests: 196 passed, 3 files failed (`gemma-llamacpp`, `laya`, `gemma` real-model tests: "bad allocation" loading ONNX/GGUF models on this machine; hub files had no merge conflicts).

## Follow-ups
Re-run the hub model tests on a machine with more free memory.
