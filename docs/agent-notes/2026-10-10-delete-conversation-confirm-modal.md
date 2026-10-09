# Delete conversation confirm modal

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Replace the browser `window.confirm` when deleting a sidebar conversation with the app’s native `<dialog>` confirm (same chrome as logout).

## What changed
- [web/src/components/ConfirmDialog.tsx](../../web/src/components/ConfirmDialog.tsx) — shared `chat-history` confirm dialog
- [web/src/components/LogoutConfirmDialog.tsx](../../web/src/components/LogoutConfirmDialog.tsx) — thin trigger wrapper over `ConfirmDialog`
- [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx) — Delete opens the modal; no `window.confirm`
- [web/src/config/labels.ts](../../web/src/config/labels.ts) — tl/en/ceb delete-confirm copy
- [web/test/confirm-dialog.test.tsx](../../web/test/confirm-dialog.test.tsx) — smoke render of delete copy

## Decisions
Reuse the existing logout dialog chrome instead of inventing a second modal style. Menu Delete cannot own the trigger button, so the dialog opens via `showModal()` from the sidebar.

## Verification
- `pnpm --filter @ugatan/web exec -- tsc --noEmit`: passed
- `pnpm --filter @ugatan/web test`: 197 passed
- Browser click-through not run in this session

## Follow-ups
Rename still uses `window.prompt`; same modal treatment if that becomes noisy.
