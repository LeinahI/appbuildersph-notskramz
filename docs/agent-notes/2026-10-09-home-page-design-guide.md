# Home-page design guide

- Date: 2026-10-09
- Agent: Codex
- Status: done

## Task

Create a concise, implementation-facing `design.md` that captures the existing Ugatan Home Page UI/UX.

## What changed

- Added [design.md](../../design.md) with the reusable visual, layout, responsive, accessibility, localization, and implementation rules for the implemented home page.
- Added no application, behavior, data, or dependency changes.

## Decisions

The guide documents the current `HomePage` and shared CSS rather than the older Figma planning spec, so another model can follow the design that is actually implemented.

## Verification

Reviewed the guide against `web/src/components/HomePage.tsx`, `web/src/index.css`, `web/src/App.tsx`, and the localized labels. No build or browser test was needed because this task changes documentation only.

## Follow-ups

None.