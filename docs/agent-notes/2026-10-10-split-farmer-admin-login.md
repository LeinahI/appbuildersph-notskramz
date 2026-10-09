# Split farmer and admin login into separate portals

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Replace the tabbed login at `/` with a Farmer portal (`/login`) and a Staff portal (`/admin/login`), with a branded split-screen layout, icons, password toggle, remember me, and inline error/loading states.

## What changed
- New [web/src/pages/FarmerLoginPage.tsx](../../web/src/pages/FarmerLoginPage.tsx): email + password only (phone/OTP removed at the user's request), TL/EN toggle, QR-linked device shortcut, `RequireFarmer` guard.
- [web/src/pages/admin/LoginPage.tsx](../../web/src/pages/admin/LoginPage.tsx) is now the real admin login (work email + password, "Ugatan Staff Portal" badge). The old prefilled `admin@ugatan.com` is gone.
- Shared UI in [web/src/components/auth/](../../web/src/components/auth/) (`AuthShell`, `fields`, `icons`).
- Deleted the old tabbed `web/src/pages/LoginPage.tsx`.
- Routes in [web/src/main.tsx](../../web/src/main.tsx): `/` and `/magsasaka/login` redirect to `/login`; unknown paths go to `/login`; admin guard and logout go to `/admin/login`.
- [web/src/config/ws.ts](../../web/src/config/ws.ts): admin "Remember me" off keeps the token in sessionStorage, on keeps it in localStorage. The farmer link always stays in localStorage until the farmer logs out.
- Farmer has no server session: [web/src/lib/conversations.ts](../../web/src/lib/conversations.ts) no longer clears the farmer link and redirects on a 401. A rejecting or unreachable server only stops syncing; the chat (IndexedDB) and the `/chat` guard (a local check) keep working. Farmer "Remember me" removed. Test: [web/test/farmer-session.test.ts](../../web/test/farmer-session.test.ts).
- [web/src/lib/ws-api.ts](../../web/src/lib/ws-api.ts): `farmerLogin`, `isUnavailable`.
- Removed the phone helper, its test, and the OTP client functions.
- Theme colors `forest`, `sage`, `cream` in [web/src/index.css](../../web/src/index.css); layout line in [AGENTS.md](../../AGENTS.md).
- Logo: the user's sprout-in-pot image is now [web/public/UgatanLogoSprout.webp](../../web/public/UgatanLogoSprout.webp) (cropped to content, 640px wide). It replaces the placeholder SVG emblem on both portals: on a white tile in the dark brand panel, and bare above the card title.
- At the user's request, the farmer card has no "Admin Login" link. The admin card still links to `/login`.

## Decisions
- The `ws` API only has admin email/password login. Farmers get in through QR claim. The farmer email/password form calls an endpoint that does not exist yet (`/api/v1/auth/farmer/login`) and show "not available yet, use the QR link" on 404/405/501, instead of faking a login.
- Kept the existing Tailwind v4 + React setup; no new dependencies.

## Verification
- `tsc --noEmit` (web): passed. `pnpm test` (web): 137 passed.
- Checked `/login` and `/admin/login` in the browser at desktop and 375px width; empty-phone validation shows inline. No console errors.
- Not run: a real admin sign-in against `ws`, and the farmer password flow (no backend).

## Follow-ups
- The first farmer sign-in still needs the server to check the password. After that, nothing asks the server again. An expired or revoked token is ignored on this device, so the admin cannot cut a farmer off remotely.
- Add the farmer password endpoint to `ws`, or drop the form. Unclear whether "only Gmail" meant Google sign-in or a @gmail.com restriction; neither is built.
- "Forgot password?" only shows a contact-admin note; there is no reset flow.
- Visitors to `/admin` without a token now land on `/admin/login`, not `/`.
