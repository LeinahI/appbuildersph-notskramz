# Admin login and dashboard cleanup

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Inspect the duplicate admin login, keep `/admin/login`, remove forgot-password UI, and remove development-status banners from the sidebar dashboard and registration drawer.

## What changed
- [LoginPage.tsx](../../web/src/pages/admin/LoginPage.tsx): removed password-recovery state, button, and instructions; retained authentication, validation, password visibility, and Remember me.
- [AdminApp.tsx](../../web/src/admin/AdminApp.tsx): deleted the disabled duplicate login form; legacy empty/login/unknown hashes redirect to `/admin/login`. Desktop/mobile login links use that route. Removed preview and connection banners without changing the sidebar layout.
- [RegistrationDialog.tsx](../../web/src/admin/RegistrationDialog.tsx) and [copy.ts](../../web/src/admin/copy.ts): removed Draft only and developer-oriented copy. Unavailable actions remain disabled with specific guidance. Consent, review, discard protection, and unsaved-record explanations remain.
- [admin.css](../../web/src/admin/admin.css) and [display-preferences.css](../../web/src/display-preferences.css): removed unused duplicate-login and banner styling.
- [admin.test.tsx](../../web/test/admin.test.tsx) and [admin-login.test.tsx](../../web/test/admin-login.test.tsx): added cleanup/redirect regressions and replaced obsolete duplicate-login expectations.
- [README.md](../../README.md) and [Home.md](../../Home.md): documented the two remaining dashboard entries and indexed this note. Preserved unrelated changes.

## Decisions
- `/admin/login` is the only staff login UI. The sidebar dashboard remains a separate layout entry, not authenticated or connected to the API; no dashboard migration was requested.
- Removed implementation-status clutter, not validation or truthful unsaved-record warnings. No authentication bypass, dummy data, API/backend, model, or knowledge-base changes.
- Related: [[2026-10-10-merge-frontend-into-main]], [[2026-10-09-admin-english-login-chat-fixes]], [[2026-10-10-admin-registration-drawer]].

## Verification
- Regression red-green: initially 7 expected failures; focused cleanup tests then passed. Expanded redirect coverage includes empty, login, and unknown hashes.
- `pnpm build`: passed (TypeScript checks and browser/PWA build).
- `pnpm --filter @ugatan/web test`: 319 tests passed; existing SSR useLayoutEffect warnings remain.
- Root `pnpm test`: build, 268 shared tests, and the initial 317 frontend tests passed; interrupted while unrelated Gemma local-model tests were still running. Full suite not claimed passing.
- `pnpm --filter @ugatan/hub test --exclude test/laya.test.ts --exclude test/gemma-llamacpp.test.ts`: 194 passed, 3 skipped.
- `pnpm --filter @ugatan/hub test test/laya.test.ts`: failed because configured `D:\laya\onnx\laya.onnx` is missing; 7 tests skipped after setup failure. No model/config changes made.
- `git diff --check`: passed. No lint script is configured.
- Browser runtime reported no available browser; discovery returned an empty list. Rendered desktop/tablet/mobile QA, real staff sign-in E2E, and Android checks were not run.
- Native apply_patch helper failed on Windows; used the same patch engine via the installed Codex binary with focused patches. Removed only generated task temporary files after checking their exact path and that no tracked files were present.

## Follow-ups
- Browser/manual QA of the canonical login, legacy redirect, and sidebar/drawer cleanup remains.
- Sidebar registration and invitation controls remain unconnected; actual work uses authenticated `/admin`.
- Restore the configured local Laya bundle and finish local Gemma tests separately if full model-suite verification is needed.
