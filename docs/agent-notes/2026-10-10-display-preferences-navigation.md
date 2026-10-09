# Simplified display preference navigation

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Move farmer display settings into a home-screen icon, remove the admin login shortcut, and align the admin sidebar entry with existing navigation.

## What changed
- Added a shared current-color sliders [icon](../../web/src/components/DisplayPreferencesIcon.tsx).
- [HomePage.tsx](../../web/src/components/HomePage.tsx): icon beside history opens a labelled native Tagalog display dialog. Balanced header button groups keep existing 48px touch targets; logo can shrink on narrow screens.
- [HelpDialog.tsx](../../web/src/components/HelpDialog.tsx): removed preference controls; help/model preparation/disclaimer unchanged.
- [AdminApp.tsx](../../web/src/admin/AdminApp.tsx): removed login shortcut/callback; sidebar and mobile menu now show icon + "Display preferences" using the existing navigation styling and dialog.
- Updated [home tests](../../web/test/home-page.test.tsx), [help tests](../../web/test/help-dialog.test.tsx), [admin tests](../../web/test/admin.test.tsx), [README.md](../../README.md), and [Home.md](../../Home.md).
- Preferences/storage/AI/backend untouched. Registration drawer shortcut and draft protection retained. Unrelated working-tree/package changes preserved.

## Decisions
- Reused the existing preferences panel, chat-dialog styles and native dialog close/Escape behavior instead of introducing a new settings page or dependency.
- Preferences are separate from Tulong; saved preferences still apply to login despite removal of its shortcut.
- Related: [[2026-10-10-ui-display-preferences-implementation]].

## Verification
- Four targeted regression checks failed before the UI changes and then passed.
- Root `pnpm build` and workspace TypeScript/build/PWA checks inside `pnpm test`: passed.
- Frontend: 123 tests passed across 13 files; shared: 52 passed. Tests cover header opening without draft mutation, absent help/login controls, sidebar/mobile icon actions and existing draft retention.
- `git diff --check`: passed. No lint script exists.
- Root `pnpm test` failed on unchanged hub model checks: missing local Laya ONNX file; Gemma speed assertion 15,443ms vs <10,000ms. Hub: 76 passed, 10 skipped, one failed test plus one failed suite. No backend fixes attempted.
- Browser skill connection attempted; no browser available, discovery empty. Rendered desktop/tablet/mobile comparison and native keyboard/focus behavior were not verified.

## Follow-ups
- Manual browser QA: header at 320px and large text, dialog scrolling, Escape/close and focus return, sidebar/mobile alignment.
