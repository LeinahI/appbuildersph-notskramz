# Wire the local Gemma E2B ONNX model into the hub

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Make the local `E:\models\gemma-4-E2B-it-ONNX` model fully work on the hub. A follow-up asked for answers in 1 to 5 seconds.

## What changed
- New [hub/src/explain/gemma.ts](../../hub/src/explain/gemma.ts): `createGemmaExplainer` runs the model with `@huggingface/transformers` in Node (CPU, `q4f16`). It uses the same `buildMessages` prompt as the phone, runs one request at a time, and trims an answer that hit the token cap back to its last full sentence.
- [hub/src/config.ts](../../hub/src/config.ts): explainer name `gemma-e4b` is now `gemma`. New settings `GEMMA_MODEL_DIR` (required for gemma), `GEMMA_DTYPE`, `GEMMA_DEVICE`, `GEMMA_MAX_NEW_TOKENS` (default 150).
- [hub/src/main.ts](../../hub/src/main.ts): builds the Gemma explainer. If loading fails the hub logs it and answers with matched notes only.
- Tests: [hub/test/gemma.test.ts](../../hub/test/gemma.test.ts) (real model, skipped without `GEMMA_MODEL_DIR`), [hub/test/gemma-trim.test.ts](../../hub/test/gemma-trim.test.ts), and new cases in [hub/test/config.test.ts](../../hub/test/config.test.ts).
- [README.md](../../README.md) and [hub/.env.example](../../hub/.env.example) document the setup. `@huggingface/transformers` 4.3.0 added to `hub/package.json`.

## Decisions
- CPU with `q4f16`: it loads and gives sensible Taglish. DirectML on the RTX 4060 loaded but returned empty output and was slower, so it is not used. This also disproves the earlier README prediction that `q4f16` fails on the CPU.
- The explanation is optional, so a load failure does not stop the hub.
- Token cap 150 because the phone waits 90 s for the hub.

## Verification
- `tsc --noEmit` in `hub/`: clean.
- `pnpm --filter @ugatan/hub test` with `hub/.env`: 63 passed, including the 3 real Gemma tests and the Laya tests.
- Started the built hub with `HUB_EXPLAINER=gemma` and called `POST /ask`: matched `rice-blast`, returned a Taglish explanation in about 50 to 60 s. A brand and dosage question got neither.
- Did not run the E4B model, the web app, or a second machine.

## Follow-ups
- Speed: 12 s to about 1 minute per answer on the dev laptop (prompt read about 11 s, then 1 to 5 tokens per second). 1 to 5 s is not reachable with this ONNX route on CPU. Options: show the matched notes first and fill in the Gemma text later, or run Gemma on the GPU with llama.cpp and a GGUF file (needs a download). Not decided.
- The other session shared this working tree and rewrote `hub/.env` once; the `GEMMA_*` lines had to be added again.
