# Ugatan home page implementation

- Date: 2026-10-09
- Agent: Codex (GPT-5)
- Status: partial

## Task
Implement the frontend-only Ugatan home page from Figma frame `Home` (`1:2`), with mobile-first responsive behavior and Tagalog, English, and Cebuano interface copy.

## What changed
- Replaced the primary page shell and connected the existing question workflow in [web/src/App.tsx](../../web/src/App.tsx).
- Added the responsive presentation component in [web/src/components/HomePage.tsx](../../web/src/components/HomePage.tsx), reusing [AnswerView.tsx](../../web/src/components/AnswerView.tsx) and [QueueList.tsx](../../web/src/components/QueueList.tsx).
- Added typed, persisted UI-language labels in [web/src/config/labels.ts](../../web/src/config/labels.ts).
- Added local Figma SVGs under [web/public/home](../../web/public/home), self-hosted Manrope and DM Sans packages in [web/package.json](../../web/package.json), global tokens/focus behavior in [web/src/index.css](../../web/src/index.css), and PWA asset caching in [web/vite.config.ts](../../web/vite.config.ts).
- Added or updated focused tests under [web/test](../../web/test). No hub, shared matcher/guardrail, knowledge-base, model, or backend behavior was changed.

## Decisions
- Followed [[2026-10-09-ugatan-home-page-design]] and [[2026-10-09-ugatan-home-page-plan]]: one max-520px mobile-first shell, a fixed composer, exact local design assets, and no new UI framework.
- Language selection changes interface copy only. Existing local matching, phone AI, hub sync, queue history, and the exact pesticide disclaimer remain in place.
- Photo controls show a localized forthcoming notice because capture, recognition, and backend work are outside this task.
- Tablet and desktop use the centered mobile-width design shell because Figma supplied one Home frame; that responsive behavior is inferred.

## Verification
- `pnpm --filter @ugatan/web test`: passed, 6 files and 47 tests.
- `pnpm --filter @ugatan/web build`: passed, including PWA generation.
- `pnpm build`: passed after redirecting `TEMP` and `TMP` to D:; the first attempt failed while Workbox used the full C: temp drive.
- `pnpm test`: partial. Shared passed 52 tests, web passed 47 tests, and hub passed 71 with 16 skipped; two hub suites failed on local-model prerequisites (Gemma Vulkan host-memory allocation and missing `D:\laya\onnx\laya.onnx`).
- `git diff --check`: passed. Ten non-empty local SVGs are referenced once each, no temporary Figma/data-image URLs remain, font/icon assets are present in the service-worker precache, and no hub/shared/knowledge/eval files differ.
- No lint script exists. Browser rendering, viewport screenshot comparison, keyboard traversal, and manual control checks were not run because no in-app browser session was connected.

## Follow-ups
- Connect an in-app browser and compare mobile, tablet, and desktop renders with Figma frame `1:2`; then verify keyboard order and every control manually.
- Review Cebuano interface phrasing with a native speaker.
- Restore/provide the configured local Laya and Gemma runtime resources if a fully green repository test run is required.
