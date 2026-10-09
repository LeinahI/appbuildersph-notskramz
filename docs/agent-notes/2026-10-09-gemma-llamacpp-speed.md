# Make the hub's Gemma answers faster

- Date: 2026-10-09
- Agent: Claude Opus 5.5
- Status: done

## Task
Make the hub's Gemma response faster. It took 12 to 60 s per answer on the CPU ONNX route from [[2026-10-09-gemma-hub-explainer]]. The user chose llama.cpp on the GPU and shorter answers on the hub.

## What changed
- New [hub/src/explain/gemma-llamacpp.ts](../../hub/src/explain/gemma-llamacpp.ts): runs a Gemma 4 E2B GGUF with `node-llama-cpp` 3.22.1, with `gpuLayers: 'auto'` (as many layers on the GPU as fit, the rest on the CPU, so a teammate's smaller card still works). It keeps one chat session with a fixed system prompt, so llama.cpp reuses its cached prefix. It uses `Gemma4ChatWrapper({ reasoning: false })` (no thinking), greedy decoding, and a short warm-up at load.
- New [hub/src/explain/queue.ts](../../hub/src/explain/queue.ts): the one-at-a-time queue, now shared by both Gemma routes.
- [hub/src/config.ts](../../hub/src/config.ts): new `GEMMA_RUNTIME` (`llamacpp` default, or `onnx`), `GEMMA_GGUF`, and `GEMMA_MAX_WORDS` (default 70). `GEMMA_MAX_NEW_TOKENS` default goes from 150 to 128. `GEMMA_MODEL_DIR` is now required only for onnx.
- [hub/src/main.ts](../../hub/src/main.ts): picks the route by `GEMMA_RUNTIME`.
- [shared/src/prompt.ts](../../shared/src/prompt.ts): new `systemPrompt(maxWords)` and an optional `maxWords` argument on `buildMessages`. The phone prompt is unchanged (still 150 words); only the word limit can differ.
- Model downloaded to `E:/models/gemma-4-E2B-it-GGUF/hf_ggml-org_gemma-4-E2B-it.Q4_0.gguf` (2.84 GB, ggml-org, Apache-2.0). Local `hub/.env` points at it.
- `node-llama-cpp` added to `hub/package.json` and to `onlyBuiltDependencies` in the root `package.json`.
- Tests: new [hub/test/gemma-llamacpp.test.ts](../../hub/test/gemma-llamacpp.test.ts) (real model, skipped without `GEMMA_GGUF`, includes a 10 s limit), new [shared/test/prompt.test.ts](../../shared/test/prompt.test.ts), updated config tests.
- [README.md](../../README.md) and [hub/.env.example](../../hub/.env.example) document the new route.

## Decisions
- llama.cpp instead of tuning ONNX: the ONNX CPU route reads the prompt slowly (about 11 s) and generates 1 to 5 tokens/s. DirectML gave empty output.
- Vulkan, not CUDA: the CUDA runtime is not installed on the dev laptop, and node-llama-cpp chose Vulkan on the RTX 4060 by itself (about 4 GB VRAM). Nothing extra to install.
- Q4_0 rather than Q8_0: it is smaller and fits the 8 GB card comfortably. The answers read fine.
- The ONNX route is kept behind `GEMMA_RUNTIME=onnx` for a hub without a usable GPU.

## Verification
- `pnpm test` from the repo root: shared 43, web 29, hub 67 passed. The hub run included the real-model tests for both llama.cpp and ONNX, because `hub/.env` sets both paths.
- Built hub, `POST /ask` with 5 farmer questions: 1.1 to 2.3 s each, matching included. All Taglish, 3 numbered steps, ended naturally (not cut by the cap), guardrail passed. The brand and dosage question got neither.
- Direct timing: 0.8 to 1.2 s per answer. One earlier run had a single 18.5 s answer that did not happen again (probably first-time GPU shader setup or GPU contention).
- Model load plus warm-up at hub startup: about 40 to 50 s.
- After switching to `gpuLayers: 'auto'`: the 3 real-model llama.cpp tests passed again, 1.0 to 1.1 s per answer.
- Not run: CUDA backend, a hub without an NVIDIA GPU, the Q8_0 file, E4B, the web app against this hub.

## Follow-ups
- Another hub process (PID 47828, started 3:52 pm via `tsx src/main.ts` in this repo) listens on `127.0.0.1:8799`. Requests to 127.0.0.1:8799 go to it, not to a new hub on `0.0.0.0:8799`. Left running.
- The phone still waits up to 90 s for the hub ([web/src/lib/sync.ts](../../web/src/lib/sync.ts)). That could be lowered now, but that is a team call.
