# Home page refinements

- Date: 2026-10-09
- Agent: Codex (GPT-6)
- Status: partial

## Task
Apply the user's QA refinements directly: remove home-page clutter, add camera and microphone icons, improve desktop layout and composer focus, and use the supplied Ugatan logo.

## What changed
- [HomePage.tsx](../../web/src/components/HomePage.tsx): removed status/demo banners, photo and suggestion cards, and the permanent composer disclaimer; added the supplied logo, icon toolbar, expanding input, desktop keyboard submission, and a wider chat layout.
- [App.tsx](../../web/src/App.tsx): removed the settings/manual-sync/model-preparation panels; moved history to a native dialog; shows the submitted question above the existing answer and clears the composer after sending. New conversations abort any active dictation by remounting the composer.
- [VoiceInput.tsx](../../web/src/components/VoiceInput.tsx): reused browser speech recognition with localized listening, stop, unavailable, and permission-error behavior. Transcriptions append to the draft without submitting it.
- [labels.ts](../../web/src/config/labels.ts), [index.css](../../web/src/index.css), and [index.html](../../web/index.html): localized new controls, added a rounded composer focus ring, safe-area padding, and supported mobile-keyboard viewport resizing.
- Updated the affected [web tests](../../web/test) and [README.md](../../README.md). Used [UgatanLogo.png](../../web/public/UgatanLogo.png) without editing it.

## Decisions
- The user's new instructions supersede the initial Figma design documented in [[2026-10-09-home-page-design]] and [[2026-10-09-ugatan-home-page-implementation]].
- Kept mobile controls at 48px and used a full-width desktop shell with a centered 760px content/composer column.
- Camera remains icon-only with the existing localized unavailable notice on activation. Photo capture/recognition and backend integration remain outside scope.
- Retained the automatic question workflow and exact agricultural guardrails; no model runtime, shared matcher, knowledge, or hub files were changed. No new dependencies were added.

## Verification
- Final web tests: 59 passed in 6 files, including dictation lifecycle/errors, desktop Enter, Shift+Enter, mobile Enter, IME composition, and draft appending.
- Repository build: passed. Final web build: passed after retrying with a fresh D: temporary directory because Windows locked an esbuild temp file on the first final-build attempt.
- Root tests: failed on the configured missing Laya model and a Gemma timing assertion (10,566ms versus a 10,000ms limit). Shared passed 52; hub had 76 passed, 10 skipped, and one failed test plus the Laya suite setup failure. Web passed 53 in that root run before the final keyboard tests; its later final run passed 59.
- Generated CSS contains tablet/desktop media queries and the rounded focus rule; the logo is in the PWA precache. These are static checks, not rendered visual verification.
- Supported browser connection was unavailable. Rendered desktop/mobile/tablet comparison, real microphone/permission behavior, native-dialog keyboard traversal, and physical mobile-keyboard QA were not run.

## Follow-ups
- Review the updated layouts in a connected browser and on a real phone, including microphone permission and on-screen keyboard behavior.
- Implement photo integration when it is in scope.
