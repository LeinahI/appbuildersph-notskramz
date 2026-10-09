# Redesign "Paano gamitin" help dialog as a bottom sheet

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Modernize the help dialog: separate the how-to guide from the 5 GB offline AI setup, use step and feature cards, and make the pesticide disclaimer a clear advisory. See also [[2026-10-10-conversation-sheet-redesign]].

## What changed
- [web/src/components/HelpDialog.tsx](../../web/src/components/HelpDialog.tsx): now uses the shared `.chat-sheet` bottom sheet (grip, fixed close button, tap-outside close, swipe the handle or title bar down to close).
- Three step cards (Ilarawan o kuhanan, Ipadala with the inline arrow badge, Suriin ang gabay) and three feature cards (Mikropono, Kamera, Lokal na hub with an "Offline / Lokal na Wi-Fi" badge). Still exactly three `<li>`.
- The AI download moved into a collapsible `<details>` module "Offline AI" with a status chip, a "~5 GB libre" / "Wi-Fi ng hub" fact row, and a real progress bar while loading (`packagePercent`, never goes down). It opens by itself on loading or error.
- The disclaimer is a fixed amber `role="note"` footer. Text and `DISCLAIMER` are unchanged.
- [web/test/help-dialog.test.tsx](../../web/test/help-dialog.test.tsx): 3 new tests (layout, setup module, progress bar).

## Decisions
- Reused `.chat-sheet` so the help sheet matches the conversation sheet.
- No storage gauge: the web view cannot read real free disk space (`navigator.storage` quota is not free space), so a gauge would be made up. Showed the requirement as a fact tile instead.
- No live "hub connected" indicator: the dialog has no hub state, and `navigator.onLine` says nothing about the hub. The badge only describes how the hub works.
- `<details>` instead of tabs: works without JS and is keyboard and screen-reader friendly.

## Verification
- `pnpm exec tsc --noEmit` in `web/`: clean.
- `pnpm exec vitest run` in `web/`: 27 files, 313 tests passed.
- Checked the sheet visually at 375x812 on the dev server (top half, AI module expanded).
- Not run: swipe-to-close on a real touch device, the progress bar during a real download, dark/forced-colors modes.

## Follow-ups
- If a hub-reachability flag is passed in, the "Lokal na hub" card could show a live connected state.
- Swipe-to-close should be tried on the Android build.
