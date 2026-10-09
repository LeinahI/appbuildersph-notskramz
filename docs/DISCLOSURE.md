# Disclosure

This page lists the models, libraries, network services, and AI coding tools behind Ugatan, and the work that existed before the hackathon kickoff. Versions are the exact pins in `pnpm-lock.yaml` unless the row says otherwise. Times are git commit times in +0800 on 2026-10-09. Kickoff was 1:00 PM.

## Pre-existing work (before kickoff)

- **The repository was started before kickoff.** The first commit in this repository, `INITIAL COMMIT` (1289504, 12:31, LeinahI), held a third-party starter kit. It had `ws/` (a Laravel API starter, `grazulex/laravel-api-kit`, MIT), `core/` (a Vite and React template), `.cursor/` (AI-tool agent and rule files for that starter), and `skills-lock.json` (one skill package, `laravel-specialist`). It held no Ugatan code. Two more starter commits followed (592eabc at 12:52, and 8bc86f6 at 13:04, which is after kickoff).
- **The starter was removed.** Commit d146969 ("Remove the Laravel API kit", 15:31) removed `ws/` on another branch. That branch is not `main`.
- **Ugatan starts at 14:13.** Commit 1288983 ("Scaffold ugatan workspace with knowledge base and shared matcher") is the first commit on `main`. It has no parent. Every commit on `main` is from 14:13 to 19:01 on 2026-10-09.
- **The public history no longer shows the starter.** The local reflog of this clone records a forced update of `origin/main` at 14:46:43. Anyone who cloned before then has the 12:31 history. The team decides how to present this.
- **Leftovers in the working folder.** `core/dist/` and `core/node_modules/` came from the starter clone at 12:45. They are gitignored and not part of any commit, but they would be included in a zip of the folder. Delete them before zipping.
- **Business plan.** `docs/BUSINESS-PLAN.md` was first linked at 14:28 (7bd1363) and written in full at 15:01 (41d3405). Both times are after kickoff.

## Models

| Model | Where it runs | License | Source |
| --- | --- | --- | --- |
| `onnx-community/gemma-4-E2B-it-ONNX` (q4f16, text-only `Gemma4ForCausalLM`) | Web app, phone AI (default). Also the hub's optional ONNX route (`GEMMA_RUNTIME=onnx`, off by default). | Apache-2.0 per model card. Gemma 4 terms: https://ai.google.dev/gemma/docs/gemma_4_license | https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX |
| `ggml-org/gemma-4-E2B-it-GGUF` (Q4_0, about 2.8 GB) | Hub explanation, default route (`HUB_EXPLAINER=gemma`), run through llama.cpp with `node-llama-cpp` 3.22.1 | Apache-2.0 (the GGUF file header and the model page metadata; checked on the dev laptop) | https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF |
| `onnx-community/gemma-4-E4B-it-ONNX` | Not run. No code path loads it. | Apache-2.0 per model card | https://huggingface.co/onnx-community/gemma-4-E4B-it-ONNX |
| `receptron/laya-onnx` (Laya English bundle, downloaded when `LAYA_MODEL_DIR` is unset) | Hub matching, optional. Off by default (`HUB_MATCHER=keyword`). Not used in the demo. | Weights: Apache-2.0 per model card. Package code: MIT. | https://huggingface.co/receptron/laya-onnx |
| `convaiinnovations/laya` (English checkpoint, exported to ONNX on the hub machine, used through `LAYA_MODEL_DIR`) | Hub matching, optional. The dev laptop's `hub/.env` turns it on. Not used in the demo. | Weights: Apache-2.0 per model card. Export script: MIT (`receptron/laya`). | https://huggingface.co/convaiinnovations/laya |
| `convaiinnovations/laya-multilingual` (mmBERT-base, multilingual folder of the Laya checkpoint, exported to ONNX on 2026-10-09) | Tested only. Not the default. Not used in the demo. The README's multilingual scores come from it. | Not checked in this pass. Check the model cards of `convaiinnovations/laya-multilingual` and `jhu-clsp/mmBERT` before any redistribution. | https://huggingface.co/convaiinnovations/laya-multilingual |

The web app loads the E2B model with `Gemma4ForCausalLM` (text-only). It does not use the model card's `Gemma4ForConditionalGeneration` loader, by team decision. The text-only load skips the vision and audio graphs.

Model weights are not committed to this repository. `.gitignore` excludes `*.onnx`, `*.onnx_data`, `*.gguf`, `*.safetensors`, and the model cache folders.

## Libraries

Direct dependencies from the `package.json` files, with the versions in `pnpm-lock.yaml`:

| Library | Version | Used by | License |
| --- | --- | --- | --- |
| `@huggingface/transformers` | 4.3.0 | web (phone AI), hub (Gemma ONNX route) | Apache-2.0 |
| `onnxruntime-web` | 1.31.0-dev.20260914-8d85527a0 | web, pulled in by Transformers 4.3.0 | MIT |
| `onnxruntime-node` | 1.30.0 | hub, through Transformers and Laya | MIT |
| `node-llama-cpp` | 3.22.1 | hub (default Gemma runtime, llama.cpp) | MIT |
| `@receptron/laya` | 0.1.2, **patched** (see below) | hub (Laya matcher, optional) | MIT |
| `@huggingface/tokenizers` | 0.2.0 | Laya dependency | Apache-2.0 |
| `dexie` | 4.4.6 | web (IndexedDB queue) | Apache-2.0 |
| React and React DOM | 18.3.1 | web | MIT |
| `@types/react`, `@types/react-dom` | 18.3.12, 18.3.1 | web (types only) | MIT |
| Vite | 5.4.11 | web build | MIT |
| `@vitejs/plugin-react` | 4.3.4 | web build | MIT |
| `vite-plugin-pwa` | 0.21.2 | web (manifest and service worker) | MIT |
| Tailwind CSS and `@tailwindcss/vite` | 4.3.3 | web (styling, build plugin) | MIT |
| TypeScript | 5.6.3 | all packages | Apache-2.0 |
| Vitest | 2.1.9 | tests | MIT |
| tsx | 4.23.15 | hub and eval scripts | MIT |
| `@types/node` | 20.19.43 | hub, shared | MIT |

Transitive dependencies are not listed one by one; `pnpm-lock.yaml` has them. Two need a look before redistribution: `sharp` 0.35.5 (pulled in by Transformers; its libvips library is LGPL upstream, not checked here), and the `onnxruntime-*` packages (MIT).

`onnxruntime-web` is a development build because `@huggingface/transformers` 4.3.0 pins it that way. Check it again when the pin changes.

### Patched library

`patches/@receptron__laya@0.1.2.patch` changes the MIT package `@receptron/laya` 0.1.2. According to the README, it lets the package load the multilingual checkpoint's special-token names (`<bos>`, `<eos>`, `<mask>`, `<pad>`). The patch is applied through `pnpm.patchedDependencies` in the root `package.json`.

## Network services and APIs

The answer path needs no cloud AI API. The app and hub make these network calls:

- **Hugging Face.** The phone model (about 3.1 GB, once per device). The hub's Laya bundle (about 1.69 GB, once, when `LAYA_MODEL_DIR` is unset). The Gemma GGUF is downloaded by hand with `node-llama-cpp pull`.
- **jsDelivr CDN.** The ONNX runtime files for the phone model are loaded from `cdn.jsdelivr.net/npm/onnxruntime-web@<pinned version>`. The service worker keeps them after the first online load (`web/vite.config.ts`).
- **Browser speech recognition (voice input).** The app uses the Web Speech API with `fil-PH` (`web/src/components/VoiceInput.tsx`). In Chrome, recognition uses a speech service over the network. The app's own hint says so (`web/src/config/labels.ts`). This is browser behavior and was not captured on the network in this pass. Voice input is not offline and is not part of the demo.
- **The village hub.** Plain HTTP on the local network (`POST /ask`, `GET /health`). No internet is needed.

## Data

- The phone stores queued questions and answers in its IndexedDB (Dexie). It sends them only to the hub, and only when the hub is reachable.
- The hub writes pilot logs locally (`hub/logs/`), one JSON line per event. Each line holds the question text, the matches, and the escalation. It holds no IP address, device identifier, or user-agent string. Farmers should not type their names into a question.

## Knowledge base review

- `knowledge/` holds eight problem notes. **None is reviewed by an agronomist.** `reviewedBy` and `reviewedOn` are empty in all eight files.
- The eval sets in `eval/` were written by the developer, not labeled by an agronomist, and the scores are optimistic. The README gives the details.

## AI coding tools

- **Claude (Anthropic).** The agent notes in `docs/agent-notes/` name Claude Sonnet 5.5 (6 notes), Claude Opus 5.5 (4), and Claude Haiku 5.5 (1) as the agent. The repository does not record which harness ran those sessions. **[TEAM TO CONFIRM: that Claude Code was the tool, its version, and which members used it.]**
- **Cursor.** The pre-kickoff starter brought a `.cursor/` folder (see above). That is starter setup, not Ugatan work. **[TEAM TO CONFIRM whether anyone used Cursor on Ugatan.]**
- **Devin.** No Devin configuration or trace is in the repository. **[TEAM TO CONFIRM whether Devin was used. The briefing allows it.]**
- No Copilot, Codex, or Windsurf configuration was found in the tracked files or the git history.

## Runtime

- **Node.js.** The hub needs Node 20.12 or later, because it calls `process.loadEnvFile`. The team plans on Node 22 or 24. Node 20 reached end-of-life on 2026-04-30.
- **Browsers.** WebGPU for the phone AI, with WebAssembly on the CPU as the fallback. Keyword matching needs no special browser features, and it works offline once the app has loaded.
