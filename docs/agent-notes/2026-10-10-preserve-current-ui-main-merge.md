# Preserve current frontend UI while merging main

- Date: 2026-10-10
- Agent: Codex (GPT-6)
- Status: done

## Task
Resolve seven conflicts from pulling main into FrontEnd, preserving the UI and behavior committed in f6372e6 while integrating incoming 5051576.

## What changed
- [App.tsx](../../web/src/App.tsx): combined hub/native AI routing and natural-reply updates with draft protection, original-conversation refreshes, stale-request guards and route-load retry. Removed mismerged obsolete dialog props.
- [ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx): retained the local responsive sidebar, rename/delete dialogs, inline failures and quiet actions.
- [AdminApp.tsx](../../web/src/admin/AdminApp.tsx), [copy.ts](../../web/src/admin/copy.ts), [main.tsx](../../web/src/main.tsx): merged path-based admin shell navigation without restoring the duplicate login or developer banners; kept canonical /admin/login and RequireAdmin. Incoming renamed admin-preview.html prevents Vite intercepting /admin.
- [HomePage.tsx](../../web/src/components/HomePage.tsx): removed a duplicate automatically merged prop; aligned visibility with the 1024px sidebar breakpoint so tablet users and collapsed desktop panels retain the toggle.
- [admin.test.tsx](../../web/test/admin.test.tsx), [home-page.test.tsx](../../web/test/home-page.test.tsx): reconciled existing expectations with the single login and responsive sidebar; no new test cases added.
- [README.md](../../README.md), [Home.md](../../Home.md): preserved notes from both branches and corrected routes, preview URL, display control location and currently unavailable admin mutations.

## Decisions
Combined functional changes individually. Kept the local sidebar implementation and sign-in cleanup because those are deliberate changes in the user's current frontend commit. Incoming landing, voice, card and model-routing work remains integrated. No commit or push was requested.
Related: [[2026-10-10-admin-login-dashboard-cleanup]], [[2026-10-10-chat-sidebar-refinements-implementation]], [[2026-10-10-reconcile-frontend-main-merge]].

## Verification
- Compared merge stages, local commit and common ancestor; used CodeGraph to inspect admin routing and relevant components. Backed up conflicted files and additionally edited files in a temporary folder.
- pnpm install --frozen-lockfile --ignore-scripts: passed; installed six packages from the existing lockfile. protobufjs lifecycle script remains ignored.
- pnpm build: passed for shared, hub and web, including index.html, admin-preview.html, local ONNX assets and PWA generation.
- Conflict-marker, staged-whitespace and unmerged-index checks passed; resolved paths staged, merge remains uncommitted.
- Tests, browser/mobile interaction, Android APK build, real-model evaluation and Go/Postgres checks were not run.

## Follow-ups
Review and commit the staged merge. Run tests and browser/Android QA before release. Incoming admin shell list/metric/save/invitation actions still need API integration; disabled actions remain explicit.
