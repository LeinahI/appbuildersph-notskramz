# Disclosure

This page lists the models, libraries, and tools behind Ugatan. Versions are the exact pins in `pnpm-lock.yaml`.

## Models

| Model | Where it runs | License | Source |
| --- | --- | --- | --- |
| `onnx-community/gemma-4-E2B-it-ONNX` | Web app, phone AI (default) | Apache-2.0 (per model card). Gemma 4 terms: https://ai.google.dev/gemma/docs/gemma_4_license | https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX |
| `onnx-community/gemma-4-E4B-it-ONNX` | Hub explanation, planned. Not wired yet. | Apache-2.0 (per model card) | https://huggingface.co/onnx-community/gemma-4-E4B-it-ONNX |
| `receptron/laya-onnx` (Laya English checkpoint, from Convai Innovations) | Hub matching, optional. Not enabled. | Weights: Apache-2.0 (per model card). Package code: MIT. | https://huggingface.co/receptron/laya-onnx |

The web app loads the E2B model with `Gemma4ForCausalLM` (text-only). It does not use the model card's `Gemma4ForConditionalGeneration` loader, by team decision. The text-only load skips the vision and audio graphs.

A third-party mirror of the E4B ONNX files says "License: gemma". The official model card says Apache-2.0. Use the official card, and check the license again before any redistribution.

Model weights are not committed to this repository. `.gitignore` excludes `*.onnx`, `*.onnx_data`, `*.gguf`, `*.safetensors`, and cache folders.

## Libraries

| Library | Version | Used by | License |
| --- | --- | --- | --- |
| `@huggingface/transformers` | 4.3.0 | web (phone AI) | Apache-2.0 |
| `onnxruntime-node` | 1.30.0 | hub, through Laya (installed; Laya is not enabled yet) | MIT |
| `onnxruntime-web` | 1.31.0-dev.20260914-8d85527a0 | web, pulled in by Transformers 4.3.0 | MIT |
| `@receptron/laya` | 0.1.2 | hub (matcher, not enabled) | MIT |
| `@huggingface/tokenizers` | 0.2.0 | Laya dependency | Apache-2.0 |
| React and React DOM | 18.3.1 | web | MIT |
| Vite | 5.4.11 | web build | MIT |
| `@vitejs/plugin-react` | 4.3.4 | web build | MIT |
| TypeScript | 5.6.3 | all packages | Apache-2.0 |
| Dexie | 4.4.6 | web (IndexedDB queue) | Apache-2.0 |
| vite-plugin-pwa | 0.21.2 | web (manifest and service worker) | MIT |
| Vitest | 2.1.9 | tests | MIT |
| tsx | 4.23.15 | hub and eval scripts | MIT |
| @types/node | 20.19.43 | hub, shared | MIT |

`onnxruntime-web` is a development build because `@huggingface/transformers` 4.3.0 pins it that way. Check it again when the pin changes.

## Runtime

- Node.js 20 or newer for the hub and tooling. Node 20 is end-of-life; plan on Node 22 or 24.
- Browsers for the web app: WebGPU for the phone AI, WebAssembly as the fallback. Keyword matching needs no special browser features.

## Cloud APIs

None in the core path. The app makes no network calls except to download a model (once) and to reach the village hub on the local network.

## Data

- The web app stores queued questions and answers in the phone's IndexedDB. The phone does not send them anywhere except the hub.
- The hub writes pilot logs locally (`hub/logs/`). Each line holds the question text, the matches, and the escalation. It holds no IP address, device identifier, or user-agent string. Farmers should not type their names into a question.

## AI coding tools

[TEAM TO FILL IN: list the AI coding tools used to build this project, with versions if known.]
