# Project description and technical disclosure

## Project description

**Ugatan** is an offline Taglish advisor for Filipino rice (palay) and corn (mais) farmers. A farmer describes what they see in the field, by typing, speaking, or attaching a photo, in Tagalog, Taglish, Cebuano (Bisaya), or English. The app matches it to a likely pest or disease from a curated knowledge base of 20 problems, shows the signs, lists field steps, says when to call an expert, and explains the result in Taglish.

- **Who it is for.** Farmers with weak or no mobile data. Farmers never sign in; chats stay in the phone's own storage.
- **How it works.** A rule-based matcher (keyword, optionally Laya) decides which problem it is and whether it is sure. Gemma 4 E2B only explains that decision in Taglish; it does not diagnose. A photo adds signs and never decides alone.
- **Where it runs.** On the phone (Android APK or browser PWA), on a village hub laptop on the same Wi-Fi (no internet needed), or both. The answer path calls no cloud AI API.
- **Guardrails.** Answers never name pesticide brands or give dosages. Advice replies end with "Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide." Prompt-injection attempts are stopped before the model, and a reply may name only the problems it was given notes for.
- **Staff side.** A separate admin console (`/admin`, browser only) backed by a Go API and Postgres registers farmers and issues single-use QR invitations. The farmer app does not call it.
- **Status.** A hackathon prototype. Nothing has been reviewed by an agronomist or tested on real field photos or real farmers' voices (see "Knowledge base review" and the README's Limits).

See [README.md](../README.md) for how to run it and [BUSINESS-PLAN.md](BUSINESS-PLAN.md) for the plan.

## Technical disclosure

### Architecture

| Part | Stack | Role |
| --- | --- | --- |
| `web/` | React 18, Vite 5, TypeScript, Tailwind 4, Dexie (IndexedDB), React Router, TanStack Query | Farmer chat, setup, landing, admin console. PWA in the browser. |
| `web/android/` | Capacitor 8.5.2, Java plugins (`LocalLlmPlugin`, `SpeechPlugin`), LiteRT-LM 0.18.0 | Android APK (minSdk 24, target 36). Runs the app at `http://localhost`, so WebGPU and the model cache work. |
| `hub/` | Node.js, TypeScript, `node-llama-cpp`, Transformers.js, `onnxruntime-node` | LAN service: `POST /ask`, `POST /transcribe`, `GET /health`, model and APK downloads, setup page. |
| `shared/` | TypeScript | Matcher, knowledge validation, guardrail and rails, conversation routing, prompts. Used by web and hub. |
| `ws/` | Go 1.27, DDD layout, `pgx`, `goose`, Postgres 16 | Staff login (JWT), farmer registration, QR invites, audit. PII encrypted at rest (AES-GCM). |
| `knowledge/`, `eval/` | JSON, CSV, `tsx` scripts | 20 problem notes; labeled descriptions and scoring for keyword, Laya, voice, and photo. |

### Where the AI runs

| Where | Text | Photo / voice |
| --- | --- | --- |
| Phone away from the hub (Android) | Gemma 4 E2B `.litertlm` through LiteRT-LM | On-device when the model supports it |
| Phone on hub Wi-Fi (browser) | Gemma 4 E2B ONNX from the hub, in WebGPU | Hub vision and voice (same ONNX folder) |
| Hub | Gemma 4 E2B GGUF Q4_0 through llama.cpp | Gemma 4 E2B ONNX on the CPU |

Keyword matching and the curated notes work on any phone with no model. Laya (optional) runs on the hub and, once prepared, on the phone through `onnxruntime-web`.

 the models, libraries, network services, and AI coding tools behind Ugatan, and the work that existed before the hackathon kickoff. Versions are the exact pins in `pnpm-lock.yaml` unless the row says otherwise. Times are git commit times in +0800 on 2026-10-09. Kickoff was 1:00 PM.

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
| `onnx-community/gemma-4-E2B-it-ONNX` (q4f16, `Gemma4ForConditionalGeneration`, about 3.4 GB with vision and audio graphs) | Web app, phone AI, served to the phone by the hub. Also the hub's photo and voice model, and its optional ONNX text route (`GEMMA_RUNTIME=onnx`). | Apache-2.0 per model card. Gemma 4 terms: https://ai.google.dev/gemma/docs/gemma_4_license | https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX |
| `gemma-4-E2B-it.litertlm` (LiteRT-LM build of Gemma 4 E2B, file named by `PHONE_LITERT_FILE`) | Android app, text away from the hub, through `litertlm-android` 0.18.0. The hub serves the file to the phone. | Apache-2.0 per model card (base: `google/gemma-4-E2B-it`; Gemma 4 terms as above). Checked 2026-10-10. | https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm (matches the file name; the local copy's download origin is not recorded). Set by `PHONE_LITERT_FILE` in `hub/.env.example`. |
| `ggml-org/gemma-4-E2B-it-GGUF` (Q4_0, about 2.8 GB) | Hub explanation, default route (`HUB_EXPLAINER=gemma`), run through llama.cpp with `node-llama-cpp` 3.22.1 | Apache-2.0 (the GGUF file header and the model page metadata; checked on the dev laptop) | https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF |
| `onnx-community/gemma-4-E4B-it-ONNX` | Not run. No code path loads it. | Apache-2.0 per model card | https://huggingface.co/onnx-community/gemma-4-E4B-it-ONNX |
| `receptron/laya-onnx` (Laya English bundle, downloaded when `LAYA_MODEL_DIR` is unset) | Hub matching, optional. Off by default (`HUB_MATCHER=keyword`). Not used in the demo. | Weights: Apache-2.0 per model card. Package code: MIT. | https://huggingface.co/receptron/laya-onnx |
| `convaiinnovations/laya` (English checkpoint, exported to ONNX on the hub machine, used through `LAYA_MODEL_DIR`) | Hub matching, optional. The dev laptop's `hub/.env` turns it on. Not used in the demo. | Weights: Apache-2.0 per model card. Export script: MIT (`receptron/laya`). | https://huggingface.co/convaiinnovations/laya |
| `convaiinnovations/laya-multilingual` (mmBERT-base, multilingual folder of the Laya checkpoint, exported to ONNX on 2026-10-09) | Tested only. Not the default. Not used in the demo. The README's multilingual scores come from it. | Not checked in this pass. Check the model cards of `convaiinnovations/laya-multilingual` and `jhu-clsp/mmBERT` before any redistribution. | https://huggingface.co/convaiinnovations/laya-multilingual |

Since 2026-10-10 the web app loads the E2B model with the model card's `Gemma4ForConditionalGeneration` loader so the phone can read photos. The earlier text-only `Gemma4ForCausalLM` load (about 3.1 GB) is no longer used. Voice on the phone still goes through the phone's speech recognizer or the hub.

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
| React Router, TanStack Query, TanStack Virtual | 6.30.6, 5.104.1, 3.14.14 | web (routing, data, long lists) | MIT |
| Capacitor (`@capacitor/core`, `android`, `cli`) | 8.5.2 | web (Android APK shell) | MIT |
| `com.google.ai.edge.litertlm:litertlm-android` | 0.18.0 | Android app (on-device Gemma) | Apache-2.0 (repository LICENSE, https://github.com/google-ai-edge/LiteRT-LM; checked 2026-10-10) |
| GSAP and `@gsap/react` | 3.15.0, 2.1.2 | web (landing page animation) | GSAP: proprietary "Standard License" (free, commercial use allowed; https://gsap.com/standard-license/, checked 2026-10-10), not an open-source license. It bars use in no-code animation builders that compete with Webflow, reverse engineering, and removing branding, none of which Ugatan does. The page does not mention hackathons. `@gsap/react` MIT |
| `qrcode` | 1.5.4 | web, hub (QR codes) | MIT |
| Fontsource DM Sans and Manrope (variable) | 5.3.0 | web (bundled fonts) | OFL-1.1 |
| `@types/react`, `@types/react-dom` | 18.3.12, 18.3.1 | web (types only) | MIT |
| Sileo | 0.1.5 | web (toast notifications) | MIT |
| Motion and Framer Motion | `motion` 14.1.0 (direct); Framer Motion 12.43.0 (Sileo's dependency) | web | MIT |
| Vite | 5.4.11 | web build | MIT |
| `@vitejs/plugin-react` | 4.3.4 | web build | MIT |
| `vite-plugin-pwa` | 0.21.2 | web (manifest and service worker) | MIT |
| Tailwind CSS and `@tailwindcss/vite` | 4.3.3 | web (styling, build plugin) | MIT |
| TypeScript | 5.6.3 | all packages | Apache-2.0 |
| Vitest | 2.1.9 | tests | MIT |
| tsx | 4.23.15 | hub and eval scripts | MIT |
| `@types/node` | 20.19.43 | hub, shared | MIT |

The Go API (`ws/go.mod`) uses `pgx` 5.9.2 (Postgres driver), `goose` 3.24.2 (migrations), `golang.org/x/crypto` 0.57.0, `swaggo` (OpenAPI docs), `google/uuid`, `godotenv`, `yaml.v3`, and `testify` and `testcontainers-go` for tests; all MIT, BSD, or Apache-2.0 per upstream, not re-checked here. Its module path is still the template placeholder `github.com/yourorg/ws`.

Transitive dependencies are not listed one by one; `pnpm-lock.yaml` has them. Two need a look before redistribution: `sharp` 0.35.5 (pulled in by Transformers; its libvips library is LGPL upstream, not checked here), and the `onnxruntime-*` packages (MIT).

`onnxruntime-web` is a development build because `@huggingface/transformers` 4.3.0 pins it that way. Check it again when the pin changes.

### Patched library

`patches/@receptron__laya@0.1.2.patch` changes the MIT package `@receptron/laya` 0.1.2. According to the README, it lets the package load the multilingual checkpoint's special-token names (`<bos>`, `<eos>`, `<mask>`, `<pad>`). The patch is applied through `pnpm.patchedDependencies` in the root `package.json`.

## Network services and APIs

The answer path needs no cloud AI API. The app and hub make these network calls:

- **Hugging Face.** The phone model (about 3.1 GB, once per device). The hub's Laya bundle (about 1.69 GB, once, when `LAYA_MODEL_DIR` is unset). The Gemma GGUF is downloaded by hand with `node-llama-cpp pull`.
- **No CDN at runtime.** The ONNX runtime files are served from the app's own `/ort/` folder, and the fonts are bundled. The earlier jsDelivr load is gone.
- **Browser speech recognition (voice input).** On browser/PWA the app uses the Web Speech API (`web/src/lib/browser-speech.ts`, `fil-PH` / `en-PH`). In Chrome, recognition uses a speech service over the network. The app's own hint says so (`web/src/config/labels.ts`). On the Android app with hub voice on, speech stays on the hub Wi-Fi (`POST /transcribe`). Browser speech behavior was not captured on the network in this pass.
- **The village hub.** Plain HTTP on the local network (`POST /ask`, `POST /transcribe`, `GET /health`, `/models/...`, `/app`). No internet is needed. The Android app allows cleartext traffic for this reason (`usesCleartextTraffic`).
- **Android speech recognizer.** `SpeechPlugin` uses Android's `SpeechRecognizer` (`fil-PH`), which may send audio to Google's speech service unless the phone has the offline speech pack.
- **Staff API (`ws`).** Only the admin console calls it (`VITE_WS_URL`). The farmer app does not.

## Data

- Farmers do not sign in. Chats, setup state, and display preferences live only in the phone's IndexedDB and localStorage. Questions the phone cannot answer are sent only to the hub, and only when it is reachable.
- The Android app asks for the camera (photos), microphone (voice), and network state (to find the hub). Photos are shrunk on the phone and not stored by the hub; hub recordings are not stored either (the log keeps only lengths).
- `ws` stores farmer registration data (name, birth date, address, optional phone) with PII encrypted at rest (AES-GCM, `PII_ENCRYPTION_KEY`); staff sessions use JWT (`JWT_SECRET`). ID images are not stored in `ws` or logs. Neither secret is committed. Retention and LAN TLS are undecided.
- The hub writes pilot logs locally (`hub/logs/`), one JSON line per event. Each line holds the question text, the matches, and the escalation. It holds no IP address, device identifier, or user-agent string. Farmers should not type their names into a question.

## Knowledge base review

- `knowledge/` holds 20 problem notes: the original eight, and 12 insect notes added on 2026-10-09 (Tagalog and Cebuano card text included). **None is reviewed by an agronomist.** `reviewedBy` and `reviewedOn` are empty in all 20 files.
- Sixteen of the 20 notes carry an `insect` profile (counted in `knowledge/*.json`; 12 were added on 2026-10-09, the rest were already insects among the original eight): common name, scientific name, Filipino and regional names, crop stage, and natural enemies. The names and facts are paraphrased from PhilRice (leaflet "Harmful organisms in Philippine rice fields" and its website articles, which say "public domain unless otherwise stated"), the DA-Caraga corn technoguide *Mga Dangan sa Mais* (no licence stated), and ACIAR/IRRI fact sheets (all rights reserved, so facts only, no text copied). Sources, licences, and doubts are in `docs/agent-notes/2026-10-09-insect-identification.md`.
- Most regional names (Ilocano, Cebuano, and others) come from the one DA-Caraga guide and are not cross-checked. The armyworm species is uncertain, so the note says `Mythimna sp.`. A name nobody sourced is left out, not guessed.
- The eval sets in `eval/` were written by the developer, not labeled by an agronomist, and the scores are optimistic. The README gives the details.

## AI coding tools

- **Claude (Anthropic).** The agent notes in `docs/agent-notes/` name Claude Sonnet 5.5, Claude Opus 5.5, and Claude Haiku 5.5 as the agent (count them with `grep -h "^- Agent:" docs/agent-notes/*.md`). Every task ends with a note there, per [AGENTS.md](../AGENTS.md). The repository does not record which harness ran those sessions. **[TEAM TO CONFIRM: that Claude Code was the tool, its version, and which members used it.]**
- **Cursor.** The pre-kickoff starter brought a `.cursor/` folder (see above). That is starter setup, not Ugatan work. **[TEAM TO CONFIRM whether anyone used Cursor on Ugatan.]**
- **Devin.** No Devin configuration or trace is in the repository. **[TEAM TO CONFIRM whether Devin was used. The briefing allows it.]**
- No Copilot, Codex, or Windsurf configuration was found in the tracked files or the git history.

## Runtime

- **Node.js.** The hub needs Node 20.12 or later, because it calls `process.loadEnvFile`. The team plans on Node 22 or 24. Node 20 reached end-of-life on 2026-04-30.
- **Browsers.** WebGPU with 16-bit shaders for Gemma in the browser (no CPU fallback; Laya can fall back to the CPU). Keyword matching needs no special browser features, and it works offline once the app has loaded.
- **Android.** minSdk 24, target 36; a debug-signed APK of about 26 MB. Building it needs the Android SDK and JDK 21.
- **Go and Postgres.** Go 1.27 (`ws/go.mod`) and Postgres 16 (`postgres:16-alpine` in `ws/deployments/docker-compose.yml`).
- **Not verified on a real phone.** The phone AI ran on WebGPU in the desktop Chromium only; the Android emulator exposes no WebGPU adapter.
