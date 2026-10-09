# Setup page: one "Ugatan AI" name and one download percent

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
On the phone setup screen the download percent restarted for every file and showed "Gemma" and "Laya" as two models. Show one AI, "Ugatan AI", with one percent for the whole package that never goes back.

## What changed
- New [web/src/lib/download-progress.ts](../../web/src/lib/download-progress.ts): `FileTally` (sums bytes over a model's files) and `packagePercent` (one 0-99 number across both models).
- [web/src/lib/llm.ts](../../web/src/lib/llm.ts) and [web/src/lib/laya.ts](../../web/src/lib/laya.ts): state now carries `bytes` (loaded/total over all files); the raw "Nagda-download: N% file" text is gone.
- [web/src/workers/laya.worker.ts](../../web/src/workers/laya.worker.ts): progress posts `loaded` and `total`.
- [web/src/config/models.ts](../../web/src/config/models.ts): expected sizes (3.4 GB, 1.7 GB) used as the percent's floor.
- [web/src/pages/SetupPage.tsx](../../web/src/pages/SetupPage.tsx): one "Ugatan AI" bar with a percent, kept at its highest value; no Gemma/Laya names. Download notice says "mga 5 GB" (3.4 GB when no Laya).
- [web/src/components/HelpDialog.tsx](../../web/src/components/HelpDialog.tsx): same rename, no file names.
- Tests: new [web/test/download-progress.test.ts](../../web/test/download-progress.test.ts); help-dialog test updated.

## Decisions
The percent divides by the larger of the expected size and the size seen so far, so it does not drop when a new file starts. A ready model counts whole, and a ref keeps the peak. Laya failing still lets setup finish, as before.

## Verification
`tsc --noEmit` in `web/`: clean. `vitest run` in `web/`: 194 passed. Not run: the real download on the emulator or phone, so the bar's look on-device is unchecked.

## Follow-ups
Check the bar on the emulator. Expected sizes are rough; update them in `models.ts` if the files change.

## Update: GPU failure on the emulator
- Emulator showed "Failed to get GPU adapter" and the old Gemma/Laya UI (stale APK).
- [web/src/workers/llm.worker.ts](../../web/src/workers/llm.worker.ts): checks for a WebGPU adapter first and goes straight to the CPU (wasm) when there is none; reports the last error.
- [web/src/lib/llm.ts](../../web/src/lib/llm.ts): `load` can be called again after an error (restarts the worker).
- [web/src/pages/SetupPage.tsx](../../web/src/pages/SetupPage.tsx): on failure shows "Nabigo ang pag-download ng Ugatan AI.", a hint, the detail, "Subukan ulit" and "Ituloy nang walang AI".
- Verification: `tsc --noEmit` clean, `vitest run` 194 passed. Not run on the emulator; whether q4f16 loads on wasm there is untested.

## Update: home list and answer card
- [web/src/symptoms.ts](../../web/src/symptoms.ts): emoji icons removed.
- [web/src/components/SymptomPicker.tsx](../../web/src/components/SymptomPicker.tsx): full-width rows grouped under Palay and Mais, with a chevron, in place of wrapping chips.
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx): styling only (collapsible header with chevron, uppercase section labels, spaced lists, "Kumonsulta agad" in a warm panel, pesticide notice as a left-bordered box). Text is unchanged.
- Verification: `tsc --noEmit` clean, `vitest run` 196 passed; checked at 375px in the browser pane.

## Update: phone APK build
- Built `web/android/app/build/outputs/apk/debug/app-debug.apk` (25.8 MB) with `VITE_HUB_URL=http://192.168.137.1:8787` set for that one build (the shell value overrides `web/.env.native`, which still points at the emulator). Confirmed the address and the "Ugatan AI" text are in the built assets.
- The hub already running on 8787 reports no `phoneModel` in `/health`, so it is an older process: it must be rebuilt and restarted before a phone can download the AI. Not done here.
