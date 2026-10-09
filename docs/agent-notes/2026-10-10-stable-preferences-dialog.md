# Simplified, stable display preferences

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Remove unnecessary information from preference settings and keep the modal frame stable when users change text size.

## What changed
- Simplified [DisplayPreferencesPanel.tsx](../../web/src/components/DisplayPreferencesPanel.tsx): removed scope/automatic explanations and the separate preview. Kept all choices, reset, and the essential storage-failure warning.
- Updated [display-preferences.css](../../web/src/display-preferences.css): farmer/admin preference dialogs have a text-independent, viewport-bounded 520 px frame with stable padding and scrollable content. Close controls remain outside the scrolling body; labels still wrap and grow when needed.
- Added regressions in [panel tests](../../web/test/display-preferences-panel.test.tsx) and [style tests](../../web/test/display-preferences-styles.test.ts).
- Recorded the preference-modal rules in [design.md](../../design.md) and indexed this note in [Home.md](../../Home.md). Preserved unrelated workspace changes.

## Decisions
The controls themselves provide live typography feedback, so a separate preview is redundant. Kept accessibility preferences global rather than freezing the settings text. Used the existing shared component and targeted dialog IDs; no new dependencies or changes to other dialogs.
Related: [[2026-10-10-ui-display-preferences-implementation]], [[2026-10-10-display-preferences-navigation]], [[2026-10-10-sileo-toast-implementation]].

## Verification
- New simplification and modal-style regressions failed before implementation, then passed.
- Focused preference tests: 7 passed. Full frontend suite: 134 passed in 15 files.
- `pnpm build`: passed for shared, hub, and both web entries.
- `pnpm test`: shared 52 passed and web 134 passed. Hub: 76 passed, 10 skipped, one failed suite because the Laya model is missing, and one failed Gemma timing assertion (14,327 ms versus <10,000 ms). These are the previously recorded model gates, not changes to hub code.
- `git diff --check`: passed, including the final documentation update.
- Browser discovery returned no connected browsers. CSS checks are structural, not rendered-layout evidence.

## Follow-ups
Verify phone/desktop geometry, extra-large text, short viewports, keyboard scrolling, and close-button access in a connected browser. Existing Laya setup and Gemma timing failures remain outside this UI task.
