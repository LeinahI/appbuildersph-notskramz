# Chat sidebar and draft-safe navigation

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Implement the approved rename modal, responsive conversation sidebar, quiet chat-action feedback, and protected New Chat flow on the merged frontend.

## What changed
- [ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx), [sidebar styles](../../web/src/components/conversation-sidebar.css), and [shared viewport hook](../../web/src/components/useConversationSidebar.ts): native rename/delete dialogs, validation, pending protection, retryable inline errors, sibling action buttons, 48 px targets, loading/retry states, and surviving focus target after deletion.
- Chat/search share a collapsible 288 px desktop panel at 1024 px+, or a closed-by-default native modal drawer below that width. Only desktop open preference is persisted; mobile navigation closes the drawer.
- [App.tsx](../../web/src/App.tsx), [HomePage.tsx](../../web/src/components/HomePage.tsx), and [SearchChatsPage.tsx](../../web/src/pages/SearchChatsPage.tsx): header opens sidebar; both New Chat buttons protect unsent text/photo/unsaved questions, retain saved chats, focus /chat, and defer row creation until first send. Search deletion stays on search; inactive deletion does not navigate.
- Late creation/title/photo/status/fallback results cannot replace a newer draft. Initial deep-link loading gates sends, preserves typing, and offers retry. Failed post-delete lookup opens a fresh draft. Other chats retain their in-memory unsaved questions.
- [conversations.ts](../../web/src/lib/conversations.ts): reject blank rename/missing mutation targets, keep scoped transactional deletion, and defer active selection to guarded App callbacks instead of asynchronous read/create helpers.
- [labels.ts](../../web/src/config/labels.ts): localized action/draft/error copy. [README.md](../../README.md) and [design.md](../../design.md) describe current navigation and correct stale photo/draft guidance.
- Added sidebar, viewport, navigation, and search regression tests; updated storage/home/composition tests. Added approved [spec](../superpowers/specs/2026-10-10-chat-sidebar-refinements-design.md), [plan](../superpowers/plans/2026-10-10-chat-sidebar-refinements.md), this note and the [Home.md](../../Home.md) index.

## Decisions
- Reuse IndexedDB, React Query and native dialogs; no new dependencies, schema, farmer ws integration, AI/guardrail changes, commits or pushes.
- No success toasts for rename/delete/pin/unpin or routine navigation/send/reply/progress. Persisted row/title/pin/order is the feedback; confirmation and inline failures remain. Existing photo/voice failure and preference-reset notifications are unchanged.
- Test-first reproduced persistence failures and async races. Independent read-only review found loading, fallback and selection races; fixes were rechecked with no remaining important blockers reported.
- Preserved unrelated Obsidian workspace edits and existing merge/dev notes.
- Related: [[2026-10-10-chat-sidebar-refinement-review]], [[2026-10-10-quiet-chat-action-feedback]], [[2026-10-10-toast-auto-dismiss-implementation]].

## Verification
- Focused regressions: observed failures before implementation, then passing retries, navigation/async guards, scoped deletion, viewport changes and focus-target checks.
- Final pnpm build: passed (shared, hub, web TypeScript and Vite/PWA).
- Final pnpm --filter web test: 311 tests passed across 29 files. Existing MemoryRouter/virtualizer server-render useLayoutEffect warnings remain.
- Root pnpm test was run before the last frontend-only edge fixes: shared 268 passed; web 294 passed at that point; hub 204 passed, 10 skipped, one test failed plus one failed suite. Laya could not load D:\laya\onnx\laya.onnx; Gemma took 21.283 seconds against a 10-second assertion. Unchanged hub sources/tests were not altered to hide these failures.
- git diff --check: passed. Browser list was empty; no rendered browser or Android QA/APK build was performed.
- Scoped shell/patch commands required elevated sandbox execution because default workspace setup denied access. A Windows patch argument-escaping attempt failed without applying changes, then was corrected and verified.

## Follow-ups
- Manual release gate: phone/tablet/desktop drawer placement, nested dialogs, Escape/backdrop, focus return, enlarged text/high contrast, software keyboard/composer reachability, and real IndexedDB reload persistence.
- Restore/configure the local Laya bundle and investigate the machine-specific Gemma timing before claiming the full root suite passes.
- In-memory unsaved questions still cannot survive reload, browser exit, or leaving the App route; saved questions remain in IndexedDB.
