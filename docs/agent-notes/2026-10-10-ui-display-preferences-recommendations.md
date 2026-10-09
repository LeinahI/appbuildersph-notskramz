# UI display preferences recommendations

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Recommend cross-page UI preferences for readability and accessibility before implementing anything.

## What changed
- No application code changes. Inspected shared [styles](../../web/src/index.css), [admin styles](../../web/src/admin/admin.css), both React entry points, and the existing localStorage configuration pattern.
- Both entries share fonts/color tokens, but admin typography includes fixed pixel sizes and white backgrounds; root font scaling or token overrides alone would not cover everything.
- Proposed first release: Standard/Large/Extra large text (100/125/150%), Regular/Stronger text weight, and Automatic/High contrast. Comfortable reading spacing, usable controls, keyboard support, and reduced-motion/system accessibility support belong in the baseline rather than being paid-for or hidden behind a switch.
- Proposed one shared preferences UI: farmer Tulong, admin sidebar/mobile menu, and a visible login link; live preview, immediate application, local saving, and an easy reset.
- Proposed same-browser/same-origin persistence for farmer/admin pages, with safe fallback if storage is blocked or invalid. No identity, medical data, account sync, or backend requirement.

## Decisions
- Recommend targeted app preferences plus a sound accessible baseline over browser-only controls or a large customization center.
- Scope includes labels, fields, buttons, validation, answers, disclaimers, history, and dialogs/drawers; changing appearance must not remount/reset an unfinished workflow.
- Keep logos and future QR geometry separate from text scaling. Adapt layouts and control heights to text instead of magnifying the entire interface.
- Defer dark mode, custom fonts/colors, density controls, read-aloud, and account-linked settings until separately approved. Preserve farmer Tagalog/admin English and keep response language out of display settings.
- Brainstorming held the implementation approval gate. This is a proposal, not an approved specification.
- Related: [[2026-10-10-admin-registration-drawer]], [[2026-10-09-admin-english-login-chat-fixes]].

## Verification
- Read-only repository inspection and W3C guidance checked: [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), and [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).
- Proposed QA: all preferences on desktop/tablet/phone, 200% text resizing, 320 CSS px reflow/400% browser zoom, spacing overrides, keyboard/focus, storage failure/reload/cross-tab behavior, and draft preservation.
- Build/tests/browser QA not run: research only. No accessibility conformance claim made.
- git diff --check: passed after the research note and Home link.

## Follow-ups
- User approval of first-release scope before any application edits.
- If the hub computer is shared, local preferences carry over to the next operator; retain a prominent reset and explain device-local scope.
