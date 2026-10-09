# Toast Auto-Dismiss Implementation Plan

> **For agentic workers:** Execute the approved change inline with test-first verification.

**Goal:** Success confirmations dismiss after 3 seconds, information after 5 seconds, and errors remain until dismissed.

**Architecture:** Change the existing shared notify helper rather than its callers or Sileo internals. Keep localized early dismissal, hover pausing, dialog portals, and preference-aware layouts.

**Tech Stack:** React 18, TypeScript, Sileo 0.1.5, Vitest, pnpm 10.

## Global constraints

- Preserve unrelated edits, inline validation/safety messages, and existing display preferences.
- No new dependencies, notification preferences, vendor patches, commits, or pushes.
- Browser timing/focus behavior must not be claimed verified without a connected browser.

## Task: Shared duration policy

Files: [ToastHost.tsx](../../../web/src/components/ToastHost.tsx), [toast.test.tsx](../../../web/test/toast.test.tsx), [README.md](../../../README.md), [design.md](../../../design.md), task note and Home.md.

- [x] Change the information test to expect 5000 ms; add a success test expecting 3000 ms and matching collapse timing. Keep the error/null and localized dismissal checks.
- [x] Run `pnpm --filter @ugatan/web test test/toast.test.tsx`; confirm success/info assertions fail against 10000 ms.
- [x] Implement in notify:

```ts
const duration = type === 'error' ? null : type === 'success' ? 3000 : 5000;
// Pass duration to Sileo; use collapse: duration ?? 10000.
```

- [x] Run focused tests, then `pnpm build` and `pnpm test`. Record unrelated local-model failures separately.
- [x] Update current duration guidance in README.md and design.md; add the required Obsidian note/index line. Run `git diff --check`.

Results: focused 7 passed; web 135 passed; shared 52 passed; build passed. Root tests still fail on the missing Laya model and Gemma timing threshold (15,264 ms versus <10,000 ms). Browser unavailable; rendered timer/focus QA remains open. See [[2026-10-10-toast-auto-dismiss-implementation]].
- [x] Check connected-browser availability. If absent, leave rendered expiry, keyboard-focus, and enlarged-text reading QA explicitly open.
