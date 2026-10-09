# Local GGUF Runtime for the Hub Gemma Explainer

## Goal

Allow the Hub to use the already-downloaded Gemma GGUF model locally. The current `gemma` explainer expects a Transformers ONNX model directory, so it cannot load the `.gguf` file shown in the PowerShell output.

## Design

Keep the existing ONNX implementation as the default and add an optional llama.cpp runtime selected with `GEMMA_RUNTIME=llamacpp`. `GEMMA_RUNTIME=onnx` remains the compatibility default. The ONNX runtime continues to use `GEMMA_MODEL_DIR`; llama.cpp uses `GEMMA_GGUF` as a path to one GGUF file.

Add `node-llama-cpp` to the Hub and pnpm's approved dependency build scripts so its native runtime can install. Reuse the existing `Explainer` interface, shared `buildMessages()` prompt, token limit, pesticide-output guardrail, and note-only fallback. Load the model once at Hub startup, serialize inference as the existing explainer does, and create a fresh request context/session for each answer so conversation state cannot carry between farmers' questions.

Update `hub/.env.example` and the README with both runtime configurations. Set only the relevant local `hub/.env` values to select llama.cpp and point `GEMMA_GGUF` to the downloaded file at `E:/LocalAI/gemma-4-E2B/gemma-4-E2B-it-Q4_0.gguf`. No model pull is needed.

## Failure behavior

If the selected GGUF path is missing or the native model fails to load, preserve the current startup behavior: log the explainer error and serve matched knowledge notes without generated explanation. Do not send the local model or prompts to a remote service.

## Scope and verification

Changes are limited to Hub runtime selection and implementation, Hub dependency/build-script configuration, the local Hub environment setting, and setup documentation. No schema, web UI, or knowledge content changes are needed. After implementation, verify dependency installation and workspace build, then make one local Hub request with the GGUF runtime enabled. Automated test suites are outside this change unless requested.

The model is about 2.84 GB; generation speed and memory use depend on the user's CPU/GPU and available RAM/VRAM. Native dependency installation may need its platform binary or a source-build toolchain.
