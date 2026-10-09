# Admin nav: drop Farmer chat and Login

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Authenticated admins must not use nav links to `/` or farmer chat; remove those from the admin panel.

## What changed
- [AdminLayout.tsx](../../web/src/pages/admin/AdminLayout.tsx): removed Farmer chat and Login links
- [LoginPage.tsx](../../web/src/pages/LoginPage.tsx): redirect to `/admin` when admin JWT is present

## Decisions
Logout still goes to `/` (needed to sign in again). Only authenticated browsing of `/` is blocked via redirect.

## Verification
Not run — UI-only.

## Follow-ups
None
