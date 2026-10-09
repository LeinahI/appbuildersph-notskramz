# Sileo toast integration

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Implement Sileo toast messages using the existing shared display preferences.

## What changed
- Pinned Sileo 0.1.5 in [web/package.json](../../web/package.json) and [pnpm-lock.yaml](../../pnpm-lock.yaml); its Motion dependency resolves to 12.43.0.
- Added [ToastHost.tsx](../../web/src/components/ToastHost.tsx) and [toast.css](../../web/src/toast.css), mounted once in each farmer/admin entry. The host follows the active native dialog.
- Connected photo and voice-input availability notices in [App.tsx](../../web/src/App.tsx), display-reset notices in [DisplayPreferencesPanel.tsx](../../web/src/components/DisplayPreferencesPanel.tsx), and confirmed draft-discard notices in [RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx). Admin copy stays in [copy.ts](../../web/src/admin/copy.ts).
- Toasts inherit text size, weight, and contrast. Enlarged text, narrow screens, reduced motion, forced/system high contrast, and keyboard focus use a wrapping card instead of fixed SVG geometry. Dismissal is localized; Space can activate the close action.
- Brief notices last 10 seconds; voice errors remain until dismissed. Save/AI failures, listening progress, form validation, and agricultural safety content remain inline. No backend success is simulated.
- Added notification/host tests and extended chat, admin, and preference tests. Updated [README.md](../../README.md), [design.md](../../design.md), [DISCLOSURE.md](../DISCLOSURE.md), and [Home.md](../../Home.md). Preserved existing preference, drawer, and unrelated workspace edits.

## Decisions
Reused the existing preference store and CSS tokens. Used Sileo's API and a single dialog-aware host per entry; added no provider or state library. The accessible card avoids enlarging a fixed-size SVG along with text. Related: [[2026-10-10-sileo-toast-review]], [[2026-10-10-toast-display-preferences-approach]], [[2026-10-10-ui-display-preferences-implementation]].

## Verification
- Test-first photo/voice and admin-discard checks failed before integration, then passed.
- `pnpm build`: passed, including shared/hub TypeScript and both web entries/PWA build.
- `pnpm --filter @ugatan/web test`: 132 tests passed in 15 files, including modal-host transitions, preference changes, media changes, localized dismissal, and draft preservation.
- `pnpm --filter @ugatan/web exec tsc --noEmit` and `git diff --check`: passed.
- `pnpm test`: shared 52 passed; web 132 passed; hub 76 passed, 10 skipped, with a missing Laya model suite and a failed Gemma timing assertion (11,937 ms versus <10,000 ms). These match the earlier recorded hub gates; no hub sources or settings were changed.
- Local dev HTTP checks: farmer entry, admin entry, and toast module each returned 200.
- Browser connection unavailable; discovery returned no connected browsers. No rendered, real keyboard, screen-reader, zoom, or offline-reload QA claimed.

## Follow-ups
Browser QA at phone/desktop widths, enlarged text/high contrast, reduced/forced colors, modal opening/closing, keyboard dismissal, screen-reader announcements, and offline reload. Existing Laya setup and Gemma timing failures remain outside this UI task.
