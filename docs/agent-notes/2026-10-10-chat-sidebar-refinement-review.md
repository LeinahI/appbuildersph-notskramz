# Chat sidebar refinements review

- Date: 2026-10-10
- Agent: Codex
- Status: partial

## Task
Review the merged chat interface before implementing rename confirmation, chat-action toasts, responsive sidebar improvements, and a safe top-right New Chat flow.

## What changed
- No application code changes. Added this review and its [Home.md](../../Home.md) index entry.
- Inspected [ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx): rename uses window.prompt, mutations have no completion feedback/error handling, menu activation is nested inside a button, and width-zero/aria-hidden does not remove controls from keyboard focus.
- Inspected [App.tsx](../../web/src/App.tsx) and [SearchChatsPage.tsx](../../web/src/pages/SearchChatsPage.tsx): sidebar state differs across routes; the farmer header opens old per-chat history rather than the sidebar; New Chat clears unsent text/photo without confirmation.
- [conversations.ts](../../web/src/lib/conversations.ts) already supports local rename/pin/delete, transactional deletion, and deferred creation on first send. Keep farmer chats on IndexedDB, not ws.
- [ToastHost.tsx](../../web/src/components/ToastHost.tsx) retains the approved 3-second success / 5-second info / sticky-error policy. Current photo/voice failures and display reset already notify.
- The IDE-referenced reconcile-frontend-main-merge note is absent on disk; git log confirms the FrontEnd merge at 063a4cc.

## Decisions
Propose one rename modal with current title, Save/Cancel, inline validation, and busy protection. Keep deletion confirmation. Per the user's refinement, do not add success toasts for rename/delete/pin/unpin; the persisted title, removed row, and pin/order changes provide feedback. Keep failure handling without pretending success.
Prefer a collapsible in-flow desktop sidebar at 1024 px and above, with a native modal drawer on tablet/mobile and the same content on chat/search. Alternatives are the existing 768 px in-flow tablet layout (less chat space) or a drawer on every screen (less convenient desktop history access).
Use localized controls, real sibling buttons, 48 px targets, safe-area spacing, readable large text, loading/error/empty states, Escape/backdrop close, focus return, and no focusable closed sidebar. The drawer follows [W3C modal guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
New Chat should retain saved chats, ask before discarding unsent/unsaved content, close the mobile drawer, reset to /chat, and focus the composer. Keep deferred creation and guard late async work from changing the new draft. No toast for ordinary navigation, message sending, AI replies, or background progress.
Related: [[2026-10-10-merge-frontend-into-main]], [[2026-10-10-toast-auto-dismiss-implementation]], [[2026-10-10-defer-conversation-create]], [[2026-10-10-quiet-chat-action-feedback]].

## Verification
Read-only CodeGraph/source inspection, git status/log, current design/README, and official accessibility guidance. No build, tests, browser reproduction, live chat mutations, database migrations, commits, or pushes performed.

## Follow-ups
Design approval before application edits. Then write the implementation plan and test persistence success/failure, stale IDs, active/non-active deletion, search refresh, draft protection, async navigation, and phone/tablet/desktop keyboard behavior. Browser/Android visual QA remains a separate gate.
