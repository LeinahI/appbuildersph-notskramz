# Admin UI/UX scope and Figma inspection

- Date: 2026-10-09
- Agent: Codex
- Status: done

## Task
Inspect design.md, the current home UI, hub capabilities, and the supplied admin Figma page. Propose pages, dialogs, responsive behavior, and integration boundaries before implementation.

## What changed
- No application code changes. Read [design.md](../../design.md), the existing home component/styles, package manifests, web entry point, and hub server/logging code.
- Figma page `50:821` is named admin. Retrieved its metadata and overview screenshot; detailed design context/screenshots succeeded on child frames after the page-level context request reported no selected layer.
- Inspected registration method `50:1034`, manual `50:1317`, scan `50:1383`, review `50:1465`, user detail `50:1527`, revoked detail `50:1642`, QR dialog `50:1590`, users `50:1700`, filtered-empty users `50:2107`, QR access `50:2307`, activity `50:2714`, hub information `50:3016`, and overview content `50:1054`. The page also has activity snapshot `50:822`.
- Desktop screen frames are 1166px wide; registration dialogs 560px, other dialogs 460px. No standalone login or tablet/mobile frames appeared among the page's top-level frames.
- Existing hub routes are /health and /ask; no admin authentication, user registry, OCR, invite redemption, or admin audit API exists. Existing pilot question logs are not administrative audit records.

## Decisions
- Proposed five page views: login, overview, users, QR access, and activity log. Shared desktop sidebar/header shell; preserve the farmer home and AI runtime.
- Proposed one registration wizard with method choice, consent/details, and editable review; one user-details dialog; one QR invitation dialog; reusable confirmations for discard/revoke/regenerate; concise help and read-only hub information dialogs. No separate success page or writable settings system.
- Reuse React/Vite/TypeScript, semantic Tailwind tokens, Manrope/DM Sans, existing supplied logos, native dialogs, and suitable local/Figma assets. No new UI framework, state package, or UI library.
- Infer responsive behavior: desktop sidebar, smaller-screen navigation drawer, two-column forms collapsing to one column, table rows becoming readable mobile cards, viewport-bounded scrollable dialogs with reachable actions, and 48px touch targets.
- Recommend frontend-only first, following the earlier no-backend direction. Draft entry/review and basic validation can work; login/save/OCR/authoritative duplicate checks/QR issuance and redemption/revocation/audit remain explicitly unavailable until supported APIs exist. Do not simulate authentication or account linking.
- No seeded names, hub identities, admins, sample QR codes, statistics, or log events. Distinguish disconnected/error states from successfully loaded empty data; unknown counts are not zero.
- Proposed fields match the minimal Figma form: full name, age, barangay, municipality/city, province. Omit gender, ID numbers, and retained ID imagery unless justified later. Consent starts unchecked and precedes capture/processing. Drafts remain in memory, not localStorage or farmer-question IndexedDB.
- Initial access should be Pending until verified linking, then Active; user access status stays separate from invitation validity. Proposed QR policy follows Figma: single-use plus a 15-minute expiry; regeneration invalidates the old invitation and does not silently restore revoked access.
- The age >=18 rule is labelled demo policy in Figma and needs owner confirmation. Name/age/address can flag possible duplicates but do not establish unique identity; authoritative duplicate policy needs backend design.
- Adapt the one-time expiring token pattern documented by [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html#general-security-practices) to future invitations. Tokens and access enforcement are server responsibilities, not a frontend timer or QR image.
- Recommend Tagalog admin labels to follow design.md/home; Figma currently uses English. Flag this as an intentional proposal rather than claiming an exact-copy port.
- Related: [[2026-10-09-chat-and-help-dialogs]], [[2026-10-09-home-page-design-guide]].

## Verification
- Figma metadata, detailed child context, and screenshots retrieved successfully; no rendered admin implementation exists yet.
- Repository inspection confirmed existing libraries, current React entry, hub routes, and pilot-log format.
- git diff --check: passed after writing this note and its Home.md link.
- Build, tests, and browser QA not run: this task only inspected and proposed scope. Existing worktree/index changes were preserved.

## Follow-ups
- Owner approval of the proposed frontend-only scope before application edits.
- Confirm the real minimum-age policy; settle required identity/duplicate rules before authoritative registration.
- Backend authentication, secure persistence/encryption, OCR provider/consent workflow, QR issuance/redemption/account linking, access revocation, and administrative audit are separate implementation work. Farmer-side scanning/linking UI is not silently added to the admin task.
