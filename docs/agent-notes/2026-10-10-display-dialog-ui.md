# Improve the "Teksto at display" dialog

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
The display-preferences dialog was cramped: wrapped and clipped option labels, a chunky scrollbar, and the reset button hidden below the fold.

## What changed
- [web/src/display-preferences.css](../../web/src/display-preferences.css) only (no markup change).
- Each setting is now a connected segmented control; the checked option fills with the leaf colour. Radios are visually hidden but still keyboard and screen-reader accessible, with a focus ring.
- At Large and Extra large text sizes the options stack vertically so labels never break mid-word.
- Thin scrollbar; "Ibalik sa karaniwan" / "Reset to defaults" is sticky at the bottom; dialog frame is 560px tall (was 520px) and still independent of text scaling.
- Forced-colors mode keeps a visible checked state.

## Decisions
Kept the fixed-height frame and the `> .display-preferences` scroller because `web/test/display-preferences-styles.test.ts` requires them; used `position: sticky` for the reset button instead of restructuring the markup.

## Verification
`pnpm exec vitest run` in `web/`: 276 passed. Checked at 420x700 in the browser pane at standard and extra-large + stronger settings. Not checked: Android WebView, forced-colors mode, admin dialog (same CSS).

## Follow-ups
None

## Update: second pass (live preview)
- [web/src/components/DisplayPreferencesPanel.tsx](../../web/src/components/DisplayPreferencesPanel.tsx): added a live "Halimbawa"/"Preview" card, an "Aa" step selector for text size, "Aa" weight glyphs, contrast icons, and a quiet ghost reset button with icon. Still radios, so keyboard and screen-reader behaviour is unchanged. Settings auto-save on change, so there is no Apply button.
- [web/src/display-preferences.css](../../web/src/display-preferences.css): soft filled tracks instead of bordered boxes, 14-18px radii, frame 600px, weight/contrast rows stack only at Extra large.
- [web/test/display-preferences-panel.test.tsx](../../web/test/display-preferences-panel.test.tsx): the test that forbade a preview now expects one.
- Verification: display-preferences and home-page tests pass; checked in the browser at 420px. The full web suite had 2 failures in `conversation-dialog.test.tsx`, which belong to another session's unfinished conversation-dialog work, not this change.
