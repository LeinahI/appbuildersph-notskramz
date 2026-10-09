# Logout confirmation modal (farmer + admin)

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Show a confirmation dialog when the farmer or admin clicks Log out, instead of signing out immediately.

## What changed
- [web/src/components/LogoutConfirmDialog.tsx](../../web/src/components/LogoutConfirmDialog.tsx) — shared native `<dialog>` confirm
- [web/src/components/HomePage.tsx](../../web/src/components/HomePage.tsx) — farmer header logout opens the modal first
- [web/src/pages/admin/AdminLayout.tsx](../../web/src/pages/admin/AdminLayout.tsx) — admin nav Log out uses the same modal
- [web/src/config/labels.ts](../../web/src/config/labels.ts) — tl/en/ceb copy for farmer logout confirm

## Decisions
One small shared component (trigger + dialog) reused by both surfaces; reuse existing `chat-history` dialog chrome. Actual logout handlers unchanged (clear claim / clear admin token, navigate `/`).

## Verification
- `pnpm --filter @ugatan/web exec tsc --noEmit`: passed
- Browser click-through not run in this session

## Follow-ups
None
