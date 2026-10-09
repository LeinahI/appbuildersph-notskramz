# Android app, hub setup flow, no farmer login, GPU-only Gemma

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code), on-screen tests by Claude Haiku 5.5 subagents
- Status: done (emulator and desktop browser; not on a real phone)

## Task
Make Ugatan installable like an app, with a setup flow (get the app from the laptop hub, join its Wi-Fi, download the AI, success alert), remove farmer login so everything stays in the phone's storage, check that the download really comes from the hub, and make sure WebGPU is used.

## What changed
- Android APK with Capacitor 8.5.2 ([web/capacitor.config.ts](../../web/capacitor.config.ts), `web/android/`, `pnpm --filter @ugatan/web android:apk` via [web/scripts/android-apk.mjs](../../web/scripts/android-apk.mjs)). Runs at `http://localhost`, a secure context, so WebGPU and the model cache work; plain-http hub allowed. `--mode native` builds have no service worker. Launcher icon from `web/public/UgatanLogoSprout.webp`. Manifest: camera, microphone, and an `IMAGE_CAPTURE` query (without it Android 11+ opened the photo picker instead of the camera).
- Hub pages ([hub/src/app-page.ts](../../hub/src/app-page.ts)): `/` for the laptop (steps, QR per LAN address, status of APK/Gemma/Laya), `/app` for the phone, `/app/ugatan.apk` (`HUB_APK`). `/health` gains `app`. The hub prints the phone URLs at start and logs each finished model/APK send.
- Setup screen [web/src/pages/SetupPage.tsx](../../web/src/pages/SetupPage.tsx) at `/setup` (first launch in the APK, and "Ihanda ang AI"): polls the hub, checks memory and GPU, downloads, success alert. Setup state in [web/src/config/setup.ts](../../web/src/config/setup.ts); the chat loads the saved AI at start ([web/src/lib/prepare.ts](../../web/src/lib/prepare.ts)). The other session reworked its progress display in parallel ([[2026-10-10-setup-one-ai-progress]]).
- No farmer login: removed `FarmerLoginPage`, `ClaimPage`, `config/profile.ts`, ws chat sync, and the farmer API calls; `/login` and `/claim` redirect to the chat; the APK has no staff pages. Admin portal unchanged in the browser build.
- Gemma is WebGPU-only ([web/src/lib/gpu.ts](../../web/src/lib/gpu.ts)): every quantized embedding (q4, q4f16, uint8) uses `GatherBlockQuantized`, which the browser runtime lacks on the CPU. Setup checks for an adapter with `shader-f16` before offering the download; a failed load now stops the worker so other files stop downloading. Laya checks the adapter before trying WebGPU.
- Camera menu ("Kumuha ng litrato" / "Pumili sa gallery"), phone-width sidebar overlay, and no duplicate top-left button on phones.

## Decisions
- The hub (laptop hotspot `192.168.137.1`) hands out both the APK and the models, so no step needs the internet.
- No CPU fallback for Gemma: the fp16/fp32 embeddings (5.5 GB / 11 GB) do not fit a phone.

## Verification
- `pnpm test`: web 196, hub 211, all passed. `pnpm build` and `pnpm android:apk` passed.
- Emulator (Android 16, WebView 134, data disk moved to drive E:): setup, hub detection when Wi-Fi comes on, skip path, success alert (one tap), camera viewfinder, relaunch straight into chat, no login anywhere. Hub log confirmed real downloads to the phone (vision 99 MB, audio 171 MB at about 0.6 MB/s). Gemma could not load there: `navigator.gpu` exists but no adapter, even with `--enable-unsafe-webgpu`.
- Desktop browser (RTX 4060): adapter with shader-f16, download from the hub, success alert.
- Not checked: a real phone, Laya on a phone CPU, the full 5 GB download on the emulator.

## Follow-ups
- Test on a real 8 GB+ Android phone with a WebGPU-capable GPU.
- Release signing (keystore never committed); farmer build with `VITE_HUB_URL=http://192.168.137.1:8787` and no test switch.
- `web/.env.native` is local only; `VITE_TEST_SKIP_MEMORY_CHECK` exists for emulator tests.
