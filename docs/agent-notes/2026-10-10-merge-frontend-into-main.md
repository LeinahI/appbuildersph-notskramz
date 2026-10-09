# Merge origin/FrontEnd into main

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code subagent)
- Status: done (merge staged, not committed)

## Task
Resolve the in-progress `git merge --no-ff --no-commit origin/FrontEnd` on main (23 conflicted files). Take FrontEnd's UI (Figma home, admin preview pages, display preferences, Sileo toasts) and keep main's logic: no farmer login, `/setup`, `/chat`, `/search`, guardrails, hub voice, Android.

## What changed
- [web/src/App.tsx](../../web/src/App.tsx): main's App (routes, sidebar, phone AI, sync) plus FrontEnd's [ConversationDialog](../../web/src/components/ConversationDialog.tsx) for history (pick a question to scroll to it), photo errors and voice problems as toasts via `notify` and [voice-notice.ts](../../web/src/lib/voice-notice.ts); recording progress stays inline.
- [web/src/main.tsx](../../web/src/main.tsx): main's router (native `/setup`, `/chat`, `/search`, `/admin/*`) plus `<ToastHost />`, `display-preferences.css` and `initializeDisplayPreferences()`.
- [HomePage.tsx](../../web/src/components/HomePage.tsx): main's props and composer; FrontEnd's header with the display-preferences button and dialog.
- [HelpDialog.tsx](../../web/src/components/HelpDialog.tsx): FrontEnd's short `chat-dialog` layout; main's memory-fit, Laya, hub-only voice and photo text.
- [labels.ts](../../web/src/config/labels.ts): main's labels plus `historySaved`, `displayLabel`, `closeDisplay` (tl/en/ceb); `historyLabel` is "Mga usapan".
- [QueueList.tsx](../../web/src/components/QueueList.tsx): FrontEnd's clickable items, keeps main's answered/queued status.
- [index.css](../../web/src/index.css): FrontEnd's tokens and `chat-dialog`/history item styles.
- [vite.config.ts](../../web/vite.config.ts): main's config plus the `admin.html` preview input (browser build only) and SW denylist.
- [AdminLayout.tsx](../../web/src/pages/admin/AdminLayout.tsx): display preferences button in the real `/admin` header.
- `web/package.json`: union (adds `sileo` 0.1.5); `pnpm-lock.yaml` regenerated from main's with `pnpm install --no-frozen-lockfile`.
- AnswerView, VoiceInput and their tests, `.gitignore`, `.obsidian/workspace.json`: main's version. README, DISCLOSURE, Home.md: both sides.
- Dropped from the merge: `.codex-tmp/` (build junk, already in `.gitignore`) and `web/skills-lock.json` (agent tooling).

## Decisions
- FrontEnd's Web Speech voice tests, the "new chat opens the history dialog" test, and its help text ("photo analysis not available", "may need internet") were dropped: main has hub-only voice, a direct new chat, and photo reading.
- FrontEnd's `/admin.html` preview (not connected to `ws`) is kept beside main's real `/admin` portal; README says which is which.

## Verification
- `pnpm install`: ok. `pnpm build`: passed (shared, web incl. admin.html, hub).
- `pnpm test`: shared 268 passed, web 276 passed (25 files). Hub: 206 passed, 2 failed, 7 skipped on the full run; the failures were real-model Gemma/Laya tests with "bad allocation" (out of memory). Rerun of `test/gemma.test.ts` and `test/laya.test.ts` alone: 10 passed. The merge changed nothing in `hub/`, `shared/`, `ws/`.
- No browser or Android check was run.

## Follow-ups
- Browser QA of the toasts and display dialog on the farmer chat and `/admin`.
- The `/admin.html` preview duplicates the real admin portal; decide whether to port its look into `/admin` and drop it.
- Related: [[2026-10-10-merge-main-android-no-login]], [[2026-10-10-sileo-toast-implementation]].
