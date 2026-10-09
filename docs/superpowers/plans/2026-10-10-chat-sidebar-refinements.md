# Chat Sidebar Refinements Implementation Plan

> Execute inline in the existing workspace as requested, with test-first checks and no commits.

**Goal:** Implement the approved rename, responsive sidebar, quiet feedback, and protected New Chat flows.
**Architecture:** Reuse local conversation persistence, native dialogs, React Query invalidation, and the existing toast host. Share sidebar viewport state between chat/search; do not duplicate data stores.
**Tech stack:** React 18, TypeScript, Dexie, React Query, native dialog, Vitest, pnpm 10.

## Tasks

- [x] Storage: extend web/test/conversations-defer.test.ts to check trimmed rename, blank/missing titles, missing pin targets, scoped transactional deletion and non-selecting asynchronous helpers. Preserve schema; select chats only in guarded App callbacks.
- [x] Sidebar: add web/test/conversation-sidebar.test.tsx and web/test/sidebar-state.test.tsx. Replace window.prompt with native rename/delete form, shared useConversationSidebar hook, localized copy, and stable 48 px styles in web/src/components/conversation-sidebar.css. No success toast calls.
- [x] Navigation: add web/test/chat-navigation.test.tsx and web/test/search-sidebar.test.tsx; update App.tsx, HomePage.tsx, SearchChatsPage.tsx and composition tests. Protect drafts, close mobile drawers, guard late async work, gate unresolved deep-link sends with retry, and keep search deletion on search.
- [x] Verify: red/green regressions, pnpm build, pnpm test, final full frontend tests and git diff --check run. Independent review findings fixed/rechecked. Full-root model failures and missing browser/Android QA recorded below.
- [x] Handoff: README/design guidance and required Obsidian note/Home index updated; unrelated edits preserved.

## Verification outcome

Final build and 311 frontend tests passed. Root suite ran: shared 268 passed; unchanged hub had a missing local Laya model suite and a Gemma timing assertion failure. No connected browser was available. Rendered/Android QA remains a release gate; see [[2026-10-10-chat-sidebar-refinements-implementation]] for evidence and follow-ups.

Key checks: no duplicate or empty sessions on New Chat; no mutation success notification; rename failure leaves editable modal; delete failure preserves row; pin failure preserves state; active/non-active deletion route behavior; query invalidation on mutations; correct desktop/drawer defaults and resizing; keyboard-accessible sibling action controls; draft confirmation/cancellation; late initial-save and photo work after navigation.
