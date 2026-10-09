# English admin UI and login/chat fixes

- Date: 2026-10-09
- Agent: Codex
- Status: partial

## Task
Translate all admin UI to English, refine the login password field and remove its preview button, and make the farmer home’s Bagong usapan button open the existing chat modal.

## What changed
- Translated all labels, pages, dialogs, consent/help text, unavailable states, and validation messages in [admin copy](../../web/src/admin/copy.ts). Removed the unused preview-button label.
- Set English document language in [admin HTML](../../web/admin.html) and [AdminApp](../../web/src/admin/AdminApp.tsx).
- Replaced the password text toggle with an inline eye/eye-off icon, accessible Show/Hide password labels, and pressed state. [Admin CSS](../../web/src/admin/admin.css) now places the toggle inside the full-width password field so its edges match the username field; removed unused preview-link styling.
- Removed the login preview button. [README](../../README.md) documents /admin.html#overview for direct frontend QA, not authenticated access.
- Changed only the home new-chat callback in [App](../../web/src/App.tsx) to open the existing ConversationDialog, and added dialog semantics to the control in [HomePage](../../web/src/components/HomePage.tsx). Opening the modal preserves the current chat and unsent draft; its inner Bagong usapan action still starts a clean chat.
- Updated [admin tests](../../web/test/admin.test.tsx), [conversation tests](../../web/test/app-conversations.test.tsx), and [home tests](../../web/test/home-page.test.tsx). Preserved unrelated working-tree/index changes.
- Removed only this task’s untracked .codex-tmp/admin-refinements generated build/test artifacts; they can be regenerated.

## Decisions
- Root causes: the home control called the reset handler instead of the dialog-opening handler; the password input shared horizontal space with a text button.
- Reused the existing chat dialog, copy object, fonts, focus styles, and dependencies. Ponytail kept this to targeted wiring/styling changes and a small inline SVG; no UI package or new modal added.
- Kept the farmer interface Tagalog. Admin English does not change AI response language, runtime, knowledge, or guardrails.
- Login and credential inputs remain disconnected/disabled as required by frontend-only scope. No age eligibility cutoff or backend work was added.
- Related: [[2026-10-09-admin-frontend]], [[2026-10-09-chat-and-help-dialogs]].

## Verification
- Regression tests failed first on missing English copy, icon-toggle labels, and new-chat modal wiring, then passed after the fixes.
- pnpm --filter @ugatan/web test: 102 passed across 10 files.
- pnpm test: all workspace build/type checks passed; shared 52 passed; web 102 passed. Overall test command failed in hub: 76 passed, 10 skipped, one failed test plus one failed suite. D:/laya/onnx/laya.onnx is missing; Gemma speed was 10,245ms against the 10,000ms limit. Hub code/thresholds were not changed.
- Static built output declares lang=en and contains English login text and Show password; removed preview-button copy is absent. Literal search found no remaining targeted Tagalog admin phrases.
- git diff --check: passed. No separate lint script exists.
- Browser connection attempt returned No browser is available; troubleshooting discovery listed zero browsers. Rendered alignment, responsive layouts, toggle keyboard behavior, and native-modal interaction were not verified in-browser. Tests are SSR/callback-based.

## Follow-ups
- Browser QA of the English login at desktop/tablet/phone sizes and both chat-modal entry points.
- Actual admin authentication and other backend integrations remain separate work; direct hash navigation is only a frontend preview, not authorization.
