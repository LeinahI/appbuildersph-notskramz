# UI starting map

- Date: 2026-10-09
- Agent: Codex
- Status: done

## Task
Explain where Ugatan's current UI lives and give the team a practical starting point for UI implementation.

## What changed
- No application code changes.
- Added this research note and indexed it in [Home.md](../../Home.md).
- Mapped the current UI shell in [web/src/App.tsx](../../web/src/App.tsx), reusable views in [web/src/components](../../web/src/components), labels and bundled knowledge in [web/src/config](../../web/src/config), browser services in [web/src/lib](../../web/src/lib), and shared domain behavior in [shared/src](../../shared/src).

## Decisions
Keep the first UI slice inside web/ and reuse the existing components, labels, and Tailwind theme. Do not mix visual work with matcher, hub, or model changes unless the screen requires a new data contract.

## Verification
Read README.md; mapped the React render and data flow with CodeGraph; listed web/; inspected the UI shell, styles, labels, package configuration, recent commits, and working-tree status. git diff --check passed. No build or tests were run because no application code changed.

## Follow-ups
Choose whether the first slice is a visual refresh of the current question-and-answer screen, multilingual controls, or a new screen flow, then approve a small UI design before implementation.
