# Shared UI display preferences

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Implement the approved cross-page text size, text weight and contrast preferences, frontend only, without resetting chats or registration drafts.

## What changed
- Added shared validated local storage and cross-tab/system-contrast handling in [displayPreferences.ts](../../web/src/config/displayPreferences.ts), reusable English/Tagalog controls in [DisplayPreferencesPanel.tsx](../../web/src/components/DisplayPreferencesPanel.tsx), and [display-preferences.css](../../web/src/display-preferences.css).
- Updated both entry points: [main.tsx](../../web/src/main.tsx), [admin/main.tsx](../../web/src/admin/main.tsx). Restore settings before rendering.
- Connected farmer preferences inside [HelpDialog.tsx](../../web/src/components/HelpDialog.tsx); admin login/sidebar/mobile menu via [AdminApp.tsx](../../web/src/admin/AdminApp.tsx); inline collapsed preferences in [RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx).
- Updated [HomePage.tsx](../../web/src/components/HomePage.tsx), [index.css](../../web/src/index.css), and [admin.css](../../web/src/admin/admin.css) for scalable text, stronger weights, wrapping, input focus, darker secondary text, and high/forced-color modes. Logos retain pixel geometry; icon targets remain 48px.
- Added three preference test files under [web/test](../../web/test), and extended admin/chat draft tests. Updated [README.md](../../README.md) and [Home.md](../../Home.md).
- No new dependencies, backend/model/retrieval/knowledge changes, AI-language changes, or personal-data persistence. Preserved earlier drawer changes and unrelated notes/Obsidian edits.

## Decisions
- Standard/Large/Extra large are 100/125/150%; Regular/Stronger and Automatic/High are immediate, with preview and reset.
- Reused React's external-store subscription and native radio groups/details/dialogs. No provider, state package, nested modal or page remount.
- Blocked storage keeps settings usable in memory and explains that saving is unavailable. Reset changes only the display-preference key. Same-origin tabs share preferences; shared-computer operators inherit them.
- Large text uses fewer admin grid columns; registration labels/fields become one column without implicit columns from existing spans. Controls grow/wrap rather than clipping; motion was not added.
- Related: [[2026-10-10-ui-display-preferences-recommendations]], [[2026-10-10-admin-registration-drawer]].

## Verification
- Red-green: six store tests failed before implementation; three entry-point/draft tests failed before integration, then passed.
- `pnpm build`: passed (shared, hub, web TypeScript and production/PWA build).
- `pnpm --filter @ugatan/web test`: 121 tests passed across 13 files, including persistence, invalid settings, blocked storage, cross-tab updates, system contrast, live controls, draft preservation and style checks.
- Palette checks: tested shared text tokens >=4.5:1 on shared surfaces; high palette >=7:1 on tested surfaces; default input boundary >=3:1 on white. These are token checks, not an accessibility conformance audit.
- `pnpm test`: failed on existing hub environment gates. Shared: 52 passed. Web at that run: 118 passed (three later tests included in the final 121-test run). Hub: 76 passed, 10 skipped, one missing-model suite (`D:\\laya\\onnx\\laya.onnx`) and one Gemma speed assertion (15,900ms vs <10,000ms).
- `git diff --check`: passed. No lint script exists.
- Browser connection attempted using the browser skill; no browser available and discovery returned an empty list. No rendered viewport comparison or manual keyboard/zoom QA claimed.

## Follow-ups
- Browser QA: phone/tablet/desktop at every preference combination, 200% text resizing, 320px reflow/400% zoom, spacing overrides, radio arrow keys, focus/close behavior, system/forced colors, and draft retention while settings are open.
- Supply the local Laya bundle and investigate Gemma runtime performance separately; neither belongs to this frontend task.
