# Admin frontend implementation

- Date: 2026-10-09
- Agent: Codex
- Status: partial

## Task
Implement the approved desktop-first, responsive admin frontend using design.md, the home UI, and the supplied Figma reference. Do not implement backend services or an 18+ eligibility requirement.

## What changed
- Added a separate [admin entry](../../web/admin.html) and [bootstrap](../../web/src/admin/main.tsx); configured [Vite](../../web/vite.config.ts) to build both entries and keep the PWA navigation fallback from substituting the farmer page for admin.html.
- Added [admin pages/shell](../../web/src/admin/AdminApp.tsx), [registration wizard](../../web/src/admin/RegistrationDialog.tsx), [native dialog/icon primitives](../../web/src/admin/AdminDialog.tsx), [draft validation](../../web/src/admin/registration.ts), [Tagalog copy](../../web/src/admin/copy.ts), and [isolated responsive styles](../../web/src/admin/admin.css).
- Login layout, overview, users, QR access, activity log, navigation drawer, concise help, and read-only hub information are available. Open /admin.html, then choose Buksan ang UI preview; this is not authenticated admin access.
- Manual entry supports unchecked consent, required-field validation, review/edit, draft-record preview, QR UI preview, and discard confirmation. Ages below 18 are accepted; only nonnegative whole-number age syntax is checked.
- No dummy users, statistics, identities, audit events, QR images, credentials, or ID scans are stored. Unknown metrics use an em dash rather than zero. Drafts stay in memory, with a best-effort before-unload warning.
- Added 19 local Figma SVGs under [public/admin](../../web/public/admin/); reused supplied Ugatan logos, installed Manrope/DM Sans, shared CSS tokens/button/focus classes, React/Vite/TypeScript, and native dialogs. No dependency added.
- Added [27 admin tests](../../web/test/admin.test.tsx) and [README usage/limitations](../../README.md). Farmer components, model runtime, hub services, shared guardrails, and knowledge files were not changed by this task.
- Removed only this task's untracked .codex-tmp/admin-frontend generated test/build artifacts; they can be regenerated. Stopped only this task's preview server on port 5194; existing user work and server were preserved.

## Decisions
- Used inspected Figma file y0NjRXQf011WO4POLFHpmQ, admin page 50:821: overview/method 50:1034, sidebar 50:924, manual 50:1317, scan 50:1383, review 50:1465, record 50:1527, revoked reference 50:1642, QR dialog 50:1590, users 50:1700 and 50:2107, QR access 50:2307, activity 50:2714, hub information 50:3016. Detailed context and screenshots were retrieved, not inferred from an inaccessible file.
- Figma desktop width is 1166px, sidebar 210px, forms 560px, other dialogs 460px. Login and responsive layouts are inferred: desktop sidebar; below 1024px navigation drawer and two-column metrics; below 640px stacked forms/actions with 16px gutters and viewport-bounded dialogs.
- Intentionally adapted English copy to approved Tagalog, excluded Figma sample data/demo simulations and its demo 18+ policy, and did not display the reference's static QR as a real invitation.
- Login, OCR capture, save, authoritative duplicate checking, QR issuance/redemption, access changes, and audit querying are explicitly unavailable. Backend-dependent controls are disabled with reasons, not simulated. Regenerate/revoke confirmations and live status transitions cannot be exercised without real records.
- QR policy copy is a proposed single-use, 15-minute invitation contract, not a frontend security guarantee. No browser timer or local token pretends to enforce it.
- Figma workflow informed downloaded local assets and layout dimensions; Ponytail kept existing dependencies/platform dialogs and omitted unsupported simulated workflows.
- Related: [[2026-10-09-admin-ui-ux-scope]], [[2026-10-09-chat-and-help-dialogs]], [[2026-10-09-home-page-design-guide]].

## Verification
- pnpm build: passed, including TypeScript and both Vite/PWA entries.
- pnpm --filter @ugatan/web test: 99 passed across 10 files, including 27 admin tests. Tests cover under-18 drafts, consent, required details, review/edit/discard, route rendering, unavailable metrics/actions, and no fake QR.
- pnpm test: not fully passing. Shared: 52 passed. Web: 99 passed. Hub: 76 passed, 10 skipped, one failed test plus one failed suite. Laya model D:/laya/onnx/laya.onnx is missing; Gemma timing test took 32,590ms against its 10,000ms limit. No backend files or timing thresholds were changed.
- Built preview: HTTP 200 for both HTML entries, admin JS, all 19 icons and supplied logos; corrected pending/today icon roots remain 19x19. Admin chunk does not contain the farmer LLM worker, Hugging Face, or Dexie imports.
- git diff --check: passed before handoff. No lint script exists; separate lint was not run.
- Browser runtime reported no browser and listed zero connected browsers. No rendered Figma comparison, desktop/tablet/phone overflow check, keyboard interaction run, or real-browser dialog test was possible. Automated tests are SSR/callback-based, not browser QA.

## Follow-ups
- Connect a browser and compare the rendered desktop at the reference dimensions, then test tablet/phone wrapping, navigation, focus, dialogs, and all controls. Visual fidelity and accessibility behavior are not yet verified in-browser.
- Real authentication/authorization, secure persistence, OCR, duplicate rules, QR issuance/redemption/account linking, revocation, and administrative audit remain separate backend work. Frontend preview must not be treated as a protected production admin system.
