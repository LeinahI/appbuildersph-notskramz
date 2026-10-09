# Run Gemma and Laya on the phone, with photo reading

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done (checked in the desktop app's Chromium, not on a phone)

## Task
Run both models (Gemma and Laya) on the phone and make sure photo upload works. Follows [[2026-10-10-local-only-offline]].

## What changed
- Phone Gemma now loads `Gemma4ForConditionalGeneration` (about 3.4 GB at q4f16, vision and audio graphs included) instead of the text-only loader, and reads photos with the hub's form ([web/src/workers/llm.worker.ts](../../web/src/workers/llm.worker.ts)).
- Laya runs on the phone in its own worker on `onnxruntime-web` ([web/src/workers/laya.worker.ts](../../web/src/workers/laya.worker.ts), client [web/src/lib/laya.ts](../../web/src/lib/laya.ts)). `@receptron/laya` only runs on Node, so its choice-question input is ported in [web/src/lib/laya-sequence.ts](../../web/src/lib/laya-sequence.ts) (MIT, attributed). Bundle kept in Cache Storage; if the browser refuses (low storage), it loads from the hub uncached.
- The hub's hybrid matcher rules on the phone: [web/src/lib/hybrid.ts](../../web/src/lib/hybrid.ts). [web/src/App.tsx](../../web/src/App.tsx) `answerOnPhone` runs the hub's steps: photo, match, explain or chat. Nothing waits for the hub once the phone AI is ready.
- Shared: `problemOptions`/`LAYA_INSTRUCTIONS` moved to [shared/src/laya.ts](../../shared/src/laya.ts); `describeOutcome` in [shared/src/prompt.ts](../../shared/src/prompt.ts) (the hub uses it too).
- Hub serves `LAYA_MODEL_DIR` at `/models/laya/` and adds `phoneLaya` and `layaThreshold` to `/health` ([hub/src/models.ts](../../hub/src/models.ts), [hub/src/server.ts](../../hub/src/server.ts)).
- `web` gained `onnxruntime-web` and `@huggingface/tokenizers` (same versions already in the store; installed with `--offline`). Vite pre-bundles them so `pnpm dev` does not reload the page when the workers start.
- `.claude/launch.json`: `hub-models` (port 8788, serves files only) and `web-phone` (port 3001, pointing at it).

## Decisions
- Laya loads after Gemma, so the two loads never hold memory at once. Its threshold comes from the hub so the phone decides "sure" with the team's value.
- The Laya port was checked against the original `buildSequence` with the real tokenizer and all 20 options: 3 of 3 questions gave identical ids and markers.

## Verification
- `pnpm build`: passed. Tests: shared 260, web 193, hub 207, all passed.
- Browser (Chromium in the desktop app, WebGPU, 32 GB machine): both models loaded on WebGPU from the local hub. Every cached file came from `127.0.0.1:8788` or the app's `/ort/`. A real photo (`eval/photos/golden-apple-snail-1.jpg`) sent with no text was read on the phone ("Pink egg clusters on the stems"), matched not sure (caseworm, golden apple snail), and Gemma asked a question; the typed answer gave a sure golden apple snail answer with steps and the disclaimer. With the hub stopped, a Tagalog hopperburn question was answered on the phone (hybrid, not sure: rice armyworm, rice bug). The hub on 8787 was not sure either (caseworm, armyworm); neither named brown planthopper.
- Laya would not cache on this machine: C: had 3.2 GB free and Chromium refused the 1.69 GB entry. The uncached fallback was what loaded it.
- Not checked: any real phone, WebAssembly-only devices, memory use on an 8 GB phone, voice on the phone.

## Follow-ups
- Test on a real 8 GB+ Android phone; Gemma (3.4 GB) plus Laya (1.7 GB) may be too much for 8 GB.
- The vision model added a sign it did not see ("cut leaf tips"); photo accuracy is still unmeasured on the phone.
- Voice could run on the phone too: the audio graph is already downloaded.
- Matching accuracy on hopperburn-style questions (neither hub nor phone named BPH) needs `pnpm eval`.
