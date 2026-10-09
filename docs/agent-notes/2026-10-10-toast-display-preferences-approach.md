# Toast and display preferences approach

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Recommend how upcoming display preferences should apply to toast notifications.

## What changed
- No application code changes. Recommend a shared device-local preference module used by farmer and admin entries, with immediate CSS token updates and safe storage fallback.
- Retain proposed Standard/Large/Extra large text, Regular/Stronger weight, and standard/high contrast controls; respect system reduced motion automatically.
- Toasts inherit shared typography and contrast. Keep important errors inline; use brief headings, longer reading time, and accessible dismissal for transient messages.
- Verify Sileo geometry with enlarged text rather than assuming text styling alone adapts its SVG layout.
- Added this note and the [Home.md](../../Home.md) index entry. Related: [[2026-10-10-ui-display-preferences-recommendations]], [[2026-10-10-sileo-toast-review]].

## Decisions
Implement shared display preferences before connecting Sileo notices. Apply changes without remounting apps or resetting drafts. Keep notification duration as a shared default initially rather than expanding the preferences panel.

## Verification
Reviewed existing preference proposal, shared CSS, and official Sileo styling/API documentation. No build, tests, package installation, or browser QA run; this is design advice.

## Follow-ups
Implementation remains pending. Test enlarged text, narrow screens, contrast, keyboard/screen-reader behavior, reduced motion, persistence, and draft preservation.
