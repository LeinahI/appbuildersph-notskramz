# Admin registration drawer

- Date: 2026-10-10
- Agent: Codex
- Status: partial

## Task
Replace the admin user-registration modal with a responsive right-side drawer using the supplied layout reference.

## What changed
- [RegistrationDialog](../../web/src/admin/RegistrationDialog.tsx) now keeps method selection, details, review, draft record, QR preview, and discard confirmation in one right drawer.
- [AdminDialog](../../web/src/admin/AdminDialog.tsx) supports explicit left/right placement, a separate scrollable right-drawer body, heading focus, and scroll reset on step changes. Removed the unused wide-modal variant.
- [AdminApp](../../web/src/admin/AdminApp.tsx) explicitly selects the existing left drawer for navigation; help/hub dialogs remain centered.
- [Admin styles](../../web/src/admin/admin.css): full-height, right-aligned panel up to 640px wide; full-width below 640px; fixed header, independently scrolling body, safe-area padding, dimmed backdrop, and background-scroll lock while open.
- Added four regression tests in [admin tests](../../web/test/admin.test.tsx). Existing consent, validation, under-18 acceptance, edit/review, disabled backend actions, and discard protection remain unchanged.
- Removed only this task's untracked .codex-tmp/registration-drawer build/test artifacts; they can be regenerated.

## Decisions
- Reused the native modal dialog and current wizard rather than adding a drawer library or duplicating forms. Ponytail kept this to five application/test files and removed obsolete modal styling.
- Close and Escape use the existing dirty-draft confirmation; backdrop clicks do not discard data. No animation, dummy data, backend, model, or farmer-home changes.
- Related: [[2026-10-09-admin-frontend]], [[2026-10-09-admin-english-login-chat-fixes]].

## Verification
- New drawer tests failed before implementation; drawer/scroll fixes then passed.
- Final pnpm build: passed, including shared/hub TypeScript and web TypeScript/Vite/PWA.
- Final pnpm --filter @ugatan/web test: 106 passed, including 32 admin tests.
- pnpm test (before the final step-scroll enhancement): shared 52 and web 105 passed. Hub: 76 passed, 10 skipped, one failed test plus one failed suite. Missing D:/laya/onnx/laya.onnx; Gemma speed 13,332ms against the 10,000ms limit. Hub files/thresholds unchanged.
- git diff --check: passed. No separate lint script exists.
- Browser connection failed and discovery listed zero browsers. No rendered desktop/tablet/phone, overflow, mobile-keyboard, focus-trap, or real-browser scroll check was possible; tests are SSR/callback-based.

## Follow-ups
- Open /admin.html#overview and choose Register a user for rendered drawer QA at desktop, tablet, and phone widths.
- Backend actions remain unavailable by design. Visual fidelity and native-browser accessibility behavior still need a connected browser.
