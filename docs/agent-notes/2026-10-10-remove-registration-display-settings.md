# Remove registration drawer preference controls

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Remove the embedded display-preference settings from the user-registration drawer.

## What changed
- Removed the disclosure and its import from [RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx).
- Updated [admin.test.tsx](../../web/test/admin.test.tsx) to assert that the controls are absent while external appearance changes still preserve the registration draft.
- Updated [README.md](../../README.md) and [Home.md](../../Home.md).
- Existing sidebar/mobile-menu access and inherited preferences remain unchanged. Preserved concurrent toast and unrelated working-tree changes.

## Decisions
- Removed only the embedded controls; did not alter registration fields, validation, consent, draft protection or preference persistence.
- Related: [[2026-10-10-display-preferences-navigation]].

## Verification
- Targeted regression failed before the removal and passed afterwards.
- Root `pnpm build`: passed, including TypeScript and PWA build.
- `pnpm --filter @ugatan/web test` from root: 132 tests passed across 15 files.
- `git diff --check`: passed.
- Full root `pnpm test` and browser QA not rerun for this small UI removal.

## Follow-ups
- Manual visual check of the simplified registration drawer.
