# UI stack evaluation

- Date: 2026-10-09
- Agent: Codex
- Status: done

## Task
Evaluate the most appropriate implementation stack for the supplied mobile Figma design against Ugatan's existing architecture and offline requirements.

## What changed
- No application code changes.
- Added this research note and indexed it in [Home.md](../../Home.md).
- Reviewed [web/package.json](../../web/package.json), [web/vite.config.ts](../../web/vite.config.ts), [web/src/App.tsx](../../web/src/App.tsx), [web/src/index.css](../../web/src/index.css), and the current offline storage, worker, and hub-sync boundaries.

## Decisions
Keep React, TypeScript, Vite, Tailwind CSS, vite-plugin-pwa, and Dexie. Implement the custom Figma with existing semantic components and design tokens; do not add Next.js, a component suite, a global state library, or a native rewrite for this screen. Treat Capacitor as a later packaging option only if an APK or native APIs become required.

## Verification
Mapped current dependencies and UI/data flow with CodeGraph and direct config reads. Checked current official Vite, Tailwind, Vite PWA, React, Dexie, Capacitor, service-worker, and mixed-content documentation. git diff --check passed. No build or tests were run because no application code changed.

## Follow-ups
Confirm whether the pilot remains an installable browser PWA or requires an Android APK before choosing the final deployment path.
