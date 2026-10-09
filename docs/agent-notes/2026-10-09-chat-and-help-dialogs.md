# Responsive chat and concise help dialogs

- Date: 2026-10-09
- Agent: Codex
- Status: partial

## Task
Implement the screenshot's new-chat/history UI for desktop, tablet, and mobile, and simplify Tulong.

## What changed
- Added [ConversationDialog.tsx](../../web/src/components/ConversationDialog.tsx); updated [QueueList.tsx](../../web/src/components/QueueList.tsx), [App.tsx](../../web/src/App.tsx), and [HomePage.tsx](../../web/src/components/HomePage.tsx). History now offers Bagong usapan and selectable saved questions. Starting fresh preserves stored history; reopening uses saved matches and explanations without another request.
- Simplified [HelpDialog.tsx](../../web/src/components/HelpDialog.tsx) to three steps, essential microphone/photo limitations, optional AI preparation, and the unchanged pesticide disclaimer.
- Updated [index.css](../../web/src/index.css) and [labels.ts](../../web/src/config/labels.ts): shared compact native dialogs, blurred backdrop, scrollable history, wrapping, and 48px controls.
- Added [conversation-dialog.test.tsx](../../web/test/conversation-dialog.test.tsx) and [app-conversations.test.tsx](../../web/test/app-conversations.test.tsx); updated queue-list, help-dialog, and home-page tests.

## Decisions
- Reused React, native dialog, existing icons, design tokens, QueueList, IndexedDB, and knowledge lookup. No new packages, backend changes, model changes, or storage migration.
- Kept the top + as a direct fresh-chat action; the history dialog also offers it. Each existing stored question is one history item, retaining the existing latest-20 limit rather than inventing multi-turn grouping.
- Responsive sizing is inferred from the supplied screenshot: 440px maximum width, 16px minimum horizontal gutters, viewport-bounded height, and scrolling for long content.
- Guarded active-question identity so late saves, errors, and answer refreshes cannot overwrite another selected chat.
- Related: [[2026-10-09-ugatan-help-tagalog]], [[2026-10-09-home-page-refinements]].

## Verification
- Final `pnpm build`: passed (shared/hub TypeScript, web TypeScript/Vite/PWA). An initial test-only React ref typing error was corrected.
- Final `pnpm --filter @ugatan/web test`: 72 passed.
- `pnpm test`: build passed; shared 52 passed; web 71 passed before the final extra regression test; hub 76 passed, 10 skipped, 1 failed plus one failed suite. Laya cannot find `D:\laya\onnx\laya.onnx`; Gemma timing was 10,220ms against a 10,000ms assertion. Neither backend issue was changed.
- `git diff --check`: passed. No lint script exists.
- Browser client reported "No browser is available". Rendered screenshot comparison, viewport/touch checks, and real keyboard/focus behavior remain unverified. Interaction tests exercise component callbacks, not a browser.
- Redirected TEMP/TMP to a task-specific D: directory because the system temp drive lacks space; removed only those generated task artifacts. Existing staged files and unrelated work were preserved.

## Follow-ups
- Browser QA at mobile, tablet, and desktop widths, including long history, short landscape viewport, Escape, focus return, and selecting/starting chats.
- Resolve the existing local model setup and timing failures separately.
