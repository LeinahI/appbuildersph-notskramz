# Ugatan

Offline Taglish advisor for Filipino rice (palay) and corn (mais) farmers. A farmer describes what they see in the field, and the app matches it to a likely pest or disease, shows the signs, lists field steps, says when to call an expert, and explains the result in Taglish. It never names pesticide brands or gives dosages. A reply that gives treatment, control, or spraying advice ends with: "Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide." Greetings, questions, and "not sure" replies do not carry that line.

Read [docs/BUSINESS-PLAN.md](docs/BUSINESS-PLAN.md) for the plan and [docs/DISCLOSURE.md](docs/DISCLOSURE.md) for models, licenses, library versions, and the work done before kickoff. The offline demo is in [docs/DEMO.md](docs/DEMO.md), and the team is listed in [docs/TEAM.md](docs/TEAM.md).

## Layout

| Folder | What it is |
| --- | --- |
| `web/` | React + Vite + TypeScript PWA. Farmer login at `/login`, staff login at `/admin/login`, farmer chat (+ sidebar) at `/chat` or `/chat/:conversationId`, admin at `/admin`, QR claim at `/claim`. |
| `hub/` | Node.js TypeScript service for crop Q&A on the LAN. Answers `POST /ask`. |
| `ws/` | Go DDD API on Postgres 16. Admin auth, farmer registration, QR invites, audit, conversation sync. PII encrypted at rest. |
| `shared/` | Matcher, knowledge validation, pesticide guardrail, and answer composition, used by web and hub. |
| `knowledge/` | Curated problems, one JSON file each. |
| `eval/` | Labeled farmer descriptions and the script that scores keyword matching and Laya. |
| `docs/` | Disclosure and business-plan link. |

## Run the web app

You need pnpm 10 and Node 22 or 24, the versions the team plans on. The hub itself needs Node 20.12 or later, because it calls `process.loadEnvFile`. Node 20 reached end-of-life on 2026-04-30, and the `engines` field still says `>=20`. Use pnpm for every install. Do not use npm.

```bash
corepack enable
pnpm install
pnpm dev
```

Open http://localhost:3000. The port is fixed in `web/vite.config.ts` for `pnpm dev` and `preview`; if something else is using 3000, the command stops with an error instead of picking another port. Keyword matching works right away. Offline reloads (no network after the first load) apply to the built site, not to `pnpm dev`, where the service worker is off.

The app is local only: nothing it does at runtime reaches the internet. The app, the knowledge base (with Tagalog and Cebuano card text), and the fonts are bundled, and a farmer can start with **Gamitin nang walang account** at `/login`, with no server. Linking to the cooperative with a QR claim (`ws`) is optional and only turns on conversation sync.

The phone AI is optional. To turn it on, open **Tulong** (the ? button) and tap **Ihanda ang AI**. The phone downloads both models from the **hub** over its Wi-Fi, never from Hugging Face, and then runs the hub's whole answer on the phone: it reads a photo, matches (keyword, then Gemma's English, then Laya, the same hybrid rules as `hub/src/matchers/hybrid.ts`, in `web/src/lib/hybrid.ts`), and explains, with no hub needed afterwards.

- **Gemma 4 E2B** (`onnx-community/gemma-4-E2B-it-ONNX`, q4f16, `Gemma4ForConditionalGeneration`, about 3.4 GB with the vision and audio graphs). The hub serves `GEMMA_MODEL_DIR` at `/models/onnx-community/gemma-4-E2B-it-ONNX/` and says `phoneModel: "on"` in `/health`. It explains, puts unclear questions into English for the matcher, and reads photos with the hub's photo form (`buildPhotoMessages`, `photoSignsOf`). A photo adds signs and never decides alone (`photoIsSure`), as on the hub.
- **Laya** (fp32, about 1.69 GB) loads after Gemma is ready, in its own worker on `onnxruntime-web` (`web/src/workers/laya.worker.ts`; the input layout is ported from `@receptron/laya`, which only runs on Node, in `web/src/lib/laya-sequence.ts`). The hub serves `LAYA_MODEL_DIR` at `/models/laya/` and gives `phoneLaya: "on"` and the team's `layaThreshold` in `/health`; without a threshold the hub does not offer Laya. If Laya fails to load, the phone matches with keyword and Gemma's English. The bundle is kept in Cache Storage; when the browser will not keep it (low storage), it loads from the hub and is downloaded again next time.

Both ran on WebGPU in the desktop app's Chromium on 2026-10-10 (a photo question and a text question, the second with the hub stopped), not yet on a phone. The ONNX runtime comes from the app's own `/ort/` folder, not a CDN. The button shows only when the browser reports at least 8 GB of memory (`navigator.deviceMemory`); a phone that reports less keeps the notes only, and one that does not say gets a warning. The phone tries WebGPU first and falls back to WebAssembly on the CPU, which is slower. The model is held in memory, so a page reload starts at idle and the button shows again; Transformers.js keeps the files in the browser cache, so preparing again should not need the hub (not checked on a phone).

To point the app at a hub, set `VITE_HUB_URL` in `web/.env.local` (copy `web/.env.example`), or type the hub address under **Mga setting** (the gear button). `VITE_HUB_URL` is built into the app, so restart the dev server or rebuild after changing it. An address typed in the app is saved on that phone and overrides it.

Auth and chat history talk to `ws`. Set `VITE_WS_URL` (default `http://127.0.0.1:8080`). Open http://localhost:3000/ — admin signs in with email/password; farmers continue after QR claim. Chat is at `/chat/:conversationId` (claim JWT required; bare `/chat` redirects to the last active or a new chat) with a Gemini-style sidebar synced to Postgres.

Build and preview the static site. The repo does not yet set up how phones load this built site over Wi-Fi (see Pending decisions, hub network):

```bash
pnpm build
pnpm --filter @ugatan/web preview
```

## Run the registration API (`ws`)

`ws` is the Postgres-backed Go service for admin login, farmer registration, QR invites, and claim. Crop Q&A stays on `hub`.

```bash
cd ws
cp .env.example .env   # set PII_ENCRYPTION_KEY, JWT_SECRET
make docker-db-up
make migrate-up
make seed              # admin from ws/configs/seeder.yaml
make run-api           # http://127.0.0.1:8080
```

PII columns are AES-GCM ciphertext. ID images never leave the admin browser. Farmers claim with `/claim?token=…` (single-use, default 24h). Revoke users or invites from `/admin`. Confirm retention and LAN TLS with your co-op before production.

## Run the hub

The hub runs on a laptop on the same Wi-Fi as the phones.

```bash
pnpm install
pnpm build
cp hub/.env.example hub/.env
pnpm --filter @ugatan/hub start
```

Run `pnpm build` from the root the first time. The hub imports `@ugatan/shared` from its built output, and `pnpm --filter @ugatan/hub build` alone does not build `shared`. The `cp` line overwrites an existing `hub/.env`, so skip it if you already have one.

The hub reads its settings from environment variables, and loads `hub/.env` first if that file exists (copy `hub/.env.example`; it is gitignored). Variables already set in your shell win over the file. For example, in PowerShell: `$env:HUB_PORT = "8787"`.

Relative paths in `hub/.env` (`LAYA_CACHE`, `LAYA_MODEL_DIR`, `GEMMA_GGUF`, `GEMMA_MODEL_DIR`, `HUB_LOG_DIR`) resolve from the folder you start the hub in. Use absolute paths, as the examples below do.

The hub checks its settings at startup and stops with an error when one is missing:

- `HUB_MATCHER=laya` or `hybrid` needs `LAYA_PASS_MARK` and `LAYA_CONFIDENCE_THRESHOLD`. `HUB_LAYA_FALLBACK` does not get around this.
- `HUB_EXPLAINER=gemma` needs `GEMMA_GGUF` (the default llama.cpp route) or `GEMMA_MODEL_DIR` (with `GEMMA_RUNTIME=onnx`).
- `HUB_VISION=on` and `HUB_VOICE=on` each need `GEMMA_MODEL_DIR`, whichever route writes the explanation (see "Photos" and "Voice").

The hub starts listening after each model load has finished, whether it succeeded or failed. A failed Gemma load is logged, and the hub answers without an explanation. A failed Laya load falls back to keyword matching, unless `HUB_LAYA_FALLBACK` is set to something other than `keyword`, in which case the hub exits. With Gemma on, the loads take about 40 to 50 s on the dev laptop (measured 2026-10-09, see `docs/agent-notes/`); the Laya load time has not been measured.

Check it with `curl http://<laptop-ip>:8787/health`. It reports `ok` and the matcher and explainer it is running, so confirm they match your settings. If phones cannot reach it, allow Node.js through Windows Firewall on private networks, on the `HUB_PORT` (default 8787). Pilot logs go to `hub/logs/` when you start the hub from `hub/` (one `.jsonl` file per day, one JSON line per event, kept off git).

With no settings, the hub runs keyword matching with no AI explanation. Laya and the Gemma explanation are off until you set them (see "Gemma on the hub" and "Pending decisions" below).

## Laya bundle

Laya is optional and off by default (`HUB_MATCHER=keyword`). Set `HUB_MATCHER=laya` to use Laya for every question, or `HUB_MATCHER=hybrid` to answer with keyword matching when keyword is sure and ask Laya only when it is not. Either one also needs `LAYA_PASS_MARK` and `LAYA_CONFIDENCE_THRESHOLD`. Keyword stays the default because Laya does not yet pass the team's labeled-test criteria (see Pending decisions).

The hub loads an ONNX bundle with these files: `laya.onnx`, `laya.onnx.data`, `laya_config.json`, and `tokenizer/` (`tokenizer.json`, `tokenizer_config.json`). Keep `laya.onnx.data` next to `laya.onnx`. There are two ways to get the bundle:

- **Local only.** The hub never downloads Laya. `HUB_MATCHER=laya` or `hybrid` refuses to start without `LAYA_MODEL_DIR`. Put the bundle on the hub machine first: copy the English ONNX bundle (`receptron/laya-onnx`, about 1.69 GB) there by hand, or build it from the Convai checkpoint (steps 1 to 3 below).

The Hugging Face checkpoint `convaiinnovations/laya` is PyTorch, so it must be exported first. Build it on the hub machine:

1. Download `convaiinnovations/laya` (Apache-2.0 per its model card) into a local folder, for example `E:\models\laya`. The download step is in the [receptron/laya](https://github.com/receptron/laya) README.
2. Export it with `export/export_onnx.py` from [receptron/laya](https://github.com/receptron/laya) (MIT). Use Python 3.12 with `torch`, `transformers` 5.x, `safetensors`, `onnx`, `onnxscript`, `onnxruntime`, and `huggingface_hub`. On Windows, set `PYTHONUTF8=1` first.

   ```bash
   python export_onnx.py E:/models/laya E:/models/laya-onnx
   ```

3. Point the hub at the bundle with `LAYA_MODEL_DIR`. Nothing is downloaded when it is set. In PowerShell: `$env:LAYA_MODEL_DIR = "E:/models/laya-onnx"`.

Check the bundle by running the hub tests with `LAYA_MODEL_DIR` set. In PowerShell: `$env:LAYA_MODEL_DIR = "E:/models/laya-onnx"; pnpm --filter @ugatan/hub test`. Without `LAYA_MODEL_DIR` the Laya tests are skipped. Score the bundle with `pnpm eval`.

Laya runs on the GPU through onnxruntime's WebGPU backend by default (`LAYA_DEVICE=webgpu`): about 0.1 s per question on the dev laptop against about 1 s on the CPU, with the same `pnpm eval` results (a 2026-10-09 benchmark of six questions, see `docs/agent-notes/`). At startup the hub asks Laya one warm-up question. If WebGPU fails to load (including that warm-up), it logs a warning and uses the CPU. A failure on a later question is not retried on the CPU: in `hybrid` mode the hub answers with keyword matching, and in `laya` mode `/ask` returns an error. Set `LAYA_DEVICE=cpu` to skip the GPU. In the same benchmark, DirectML loaded but failed on the first answer.

Laya has a 192-token budget per question. Each option text is capped at 48 tokens. When the option texts together need more than 176 tokens, each option gets an equal share (176 divided by the number of options, rounded down), and the cut happens silently. With all 8 problems as options, the cut was in effect; with the 20 notes of 2026-10-09 each option gets about 8 tokens, so Laya has **not** been re-checked on the larger set and keyword matching stays the default; the 2026-10-09 option-text note records 22 tokens per option. Keep option text short and never put the id in it (see `problemOptions` in `shared/src/laya.ts`, which the hub and the phone share). Check any change to the options or to the knowledge base with `pnpm eval`.

## Gemma on the hub

The hub can write the Taglish explanation with a local Gemma 4 E2B model. It is off until you set `HUB_EXPLAINER=gemma`. The default route runs a GGUF file through llama.cpp (`node-llama-cpp` 3.22.1). On the dev laptop (RTX 4060, Vulkan), five test questions took 1.1 to 2.3 s each with matching included, though one run took 18.5 s (measured 2026-10-09, see `docs/agent-notes/`). Download the model once (`ggml-org/gemma-4-E2B-it-GGUF`, Q4_0, about 2.8 GB, Apache-2.0). Run this after `pnpm install`, so `npx` finds the installed `node-llama-cpp`:

```
cd hub
npx node-llama-cpp pull --dir E:/models/gemma-4-E2B-it-GGUF hf:ggml-org/gemma-4-E2B-it-GGUF:Q4_0
```

The download writes `hf_ggml-org_gemma-4-E2B-it.Q4_0.gguf` into that folder. Check the folder listing, then put these in `hub/.env`:

```
HUB_EXPLAINER=gemma
GEMMA_GGUF=E:/models/gemma-4-E2B-it-GGUF/hf_ggml-org_gemma-4-E2B-it.Q4_0.gguf
```

node-llama-cpp chooses the GPU backend and puts as many layers on it as fit. No setting forces a backend or the CPU. The dev laptop uses Vulkan. Check what it finds with `npx node-llama-cpp inspect gpu` in `hub/`. `Q8_0` (about 5 GB, not checked here) is the higher-quality file if Q4_0 answers read badly.

The older ONNX route works on a hub without a usable GPU, but takes 12 s to a minute per answer on the CPU. Set `GEMMA_RUNTIME=onnx` and `GEMMA_MODEL_DIR=E:/models/gemma-4-E2B-it-ONNX`. The hub does not download this folder, so put the files of `onnx-community/gemma-4-E2B-it-ONNX` in it yourself. Optional for it: `GEMMA_DTYPE` (default `q4f16`) and `GEMMA_DEVICE` (default `cpu`). DirectML on the GPU gave empty output.

Both routes: `GEMMA_MAX_WORDS` (default 70) is written into the prompt as the word limit. Nothing enforces it. The phone asks for 150; the hub asks for less because every token costs time. `GEMMA_MAX_NEW_TOKENS` (default 128) caps the answer. An answer that hits the cap and does not end in `.`, `!`, or `?` is trimmed. If it has several lines, the last line is dropped when the rest keeps more than a third of the text. Otherwise the text is cut at its last sentence end followed by a space, if that keeps more than a third. If neither cut works, the full text is kept. Requests run one at a time. If the model fails to load, or returns nothing, the hub answers with the matched notes only. The pesticide guardrail checks the Gemma text too. Check the model with `GEMMA_GGUF` (or `GEMMA_MODEL_DIR`) set and `pnpm --filter @ugatan/hub test`; without them the Gemma tests are skipped.

## Photos

A farmer can attach a photo of the plant (the camera button next to the text box). The hub reads it with the local Gemma 4 E2B vision model. It is off until you set `HUB_VISION=on`, and it needs the ONNX folder: `GEMMA_MODEL_DIR=E:/models/gemma-4-E2B-it-ONNX` (the same one the ONNX text route uses, `onnx-community/gemma-4-E2B-it-ONNX`, which includes `vision_encoder*.onnx`). The llama.cpp route cannot read photos: its GGUF has no vision projector file, and `node-llama-cpp` 3.22.1 has no image input. So the hub can run Gemma twice: the GGUF on the GPU for the Taglish text, and the ONNX model on the CPU for photos.

```
HUB_VISION=on
GEMMA_MODEL_DIR=E:/models/gemma-4-E2B-it-ONNX
```

Photo reading follows the same split as the rest of the hub. The vision model only writes down what is visible, in one or two plain English sentences (`PHOTO_SYSTEM_PROMPT` in `shared/src/prompt.ts`). It never names a problem. Those sentences are added to what the farmer typed, and the matcher (keyword, Laya, or `hybrid`) decides, then Gemma explains in Taglish, as in the table above. So a photo can add signs, but it cannot decide the problem by itself.

- **Phone.** The photo is shrunk to a JPEG of at most 1024 px on its long side (`web/src/lib/photo.ts`) and sent in `POST /ask` as `image` (base64, no `data:` prefix). The hub accepts a request without a photo up to 16 KB, and one with a photo up to about 1.4 MB. It refuses a file that is not a JPEG or is over 4096 px on a side, before the image library sees it (`hub/src/image.ts`). With the phone AI prepared, the phone reads the photo itself and nothing is sent; without it, a question with a photo waits for the hub.
- **Answer.** `/ask` adds `photo` (`ok`, `not-plant`, `no-signs`, `unreadable`, or `unavailable` when the hub has no photo reading) and `photoSigns` (the English signs, shown to the farmer as "Nakita sa litrato"). A photo that is not rice or corn, or shows nothing wrong, adds nothing to matching; the chat reply is told, and the app says so. The pesticide guardrail checks the photo text too. The photo is not stored on the hub, and the log keeps only the English signs and the time.
- **Speed.** The model loads in the background at startup (about 8 s once the files are cached) and stays in memory. One photo took 28 to 35 s on the dev laptop's CPU (measured 2026-10-09, with the machine otherwise idle), and 192 s once while other processes held the CPU at 82%. The first photo may wait for the load. The phone waits up to 180 s. `VISION_MAX_NEW_TOKENS` (default 128) caps the photo form the model fills in: the plant, the kind of damage, where it is, and any insects, eggs, or mold.
- **Limits.** The vision encoder takes a fixed 280 image tokens (a higher budget fails with a token and feature mismatch), so small spots in a wide photo can be missed. The same scene encoded as a different JPEG gave different descriptions. Close-up photos of the affected part should do better. This has been tried only on drawn test leaves, not on real field photos or any labeled photo set, so its accuracy is unknown. See Pending decisions.

## Voice

A farmer can speak the question instead of typing it (the mic button next to the text box). With `HUB_VOICE=on`, the phone records up to 30 seconds and the hub writes it down with the local Gemma 4 E2B audio model. No internet is needed. The words go into the text box and the farmer checks them before sending, so a mishearing never becomes an answer by itself. It uses the same ONNX folder and the same loaded model as photo reading (`GEMMA_MODEL_DIR`, `onnx-community/gemma-4-E2B-it-ONNX`, which includes `audio_encoder*.onnx`), one job at a time on the CPU. The llama.cpp route cannot do this: its GGUF has no audio projector file.

```
HUB_VOICE=on
GEMMA_MODEL_DIR=E:/models/gemma-4-E2B-it-ONNX
```

- **Phone.** The mic button records with the browser's `MediaRecorder`, converts the audio to 16 kHz mono (`web/src/lib/recorder.ts`), and sends it to `POST /transcribe` as `{ "audio": "<base64 16-bit PCM>" }`. It stops by itself 1.6 s after the farmer stops talking, or at 30 seconds, and a tap on the mic stops it sooner. Before sending, the phone cuts the silence from the start and end, raises a quiet voice (at most 8 times), and says "no speech" itself when it hears only room noise (`web/src/lib/speech.ts`), so the hub reads seconds of speech and not a long silence. The response is `{ "status": "ok" | "empty" | "unreadable" | "unavailable", "text": "..." }`. The prompt asks for the words as spoken, in the language spoken, with no translation (`TRANSCRIBE_PROMPT` in `shared/src/prompt.ts`).
- **No internet fallback.** The browser's own speech service is never used, because it sends the audio to the internet. If the hub is not reachable or has voice off, the button says to join the hub's Wi-Fi or type the question. It asks the hub again on each tap.
- **Privacy.** The recording is not stored. The hub log keeps only the length of the recording and of the text, not the words. The words reach the log only if the farmer sends them as a question.
- **Speed.** A 6 s recording took about 26 s to write down on the dev laptop's CPU when it was idle (measured 2026-10-09). A test with 3 s of silence before the sentence and 20 s of silence after it took 37 s before the phone cut silence, and 18 s after. The phone waits up to 120 s, and the first recording after a start may wait for the model to load.
- **Browsers allow the microphone only on `localhost` and on https.** A phone that opens the app over plain `http://<laptop-ip>` gets no microphone and the button falls back to browser speech or hides. This is the same problem as "Hub network" in Pending decisions.

### How well it writes Tagalog and Cebuano

Measured on 2026-10-09 with `pnpm eval:voice` on real recordings: Google FLEURS read speech, Filipino and Cebuano, each clip with the correct text. Fetch clips with `python -I eval/fetch-fleurs.py eval/voice-clips fil_ph 25000000` (and `ceb_ph`); the script reads only the first 25 MB of each archive. Word error rate counts a word wrong if one letter is off, so the character error rate is shown too.

| Weights | Tagalog, word / character error | Cebuano, word / character error | Memory |
| --- | --- | --- | --- |
| `q4f16` (the default, 4-bit) | 40.0% / 7.9% | 29.5% / 10.9% | about 3 GB |
| `quantized` (8-bit) | 13.3% / 3.2% | 25.0% / 8.5% | about 6 GB |

Two clips per language, the same prompt, so these are small numbers and not final. What they show:

- **The model hears both languages.** Most errors are near spellings ("nakatagdan" for "nakatakda", "mantes" for "martes"). The farmer sees the text and can fix it before sending, and for a question the hub's hybrid matcher reads the words through Gemma's English step, which copes with misspellings (see "Languages and reworded questions").
- **Naming the language in the prompt did not help.** The model card's prompt with "Tagalog" or "Cebuano" written in gave the same text within one word on both languages, so the hub keeps one prompt for every language and does not need to be told which one the farmer speaks. Taglish and Cebuano mixed with English need no setting either.
- **8-bit weights are more exact, but too big to default.** Loading them failed with "bad allocation" when 0.9 GB of memory was free. Set `MULTIMODAL_DTYPE=quantized` on a hub machine with plenty of free memory. Raising only the audio encoder (`AUDIO_DTYPE`) gave 64% word error on the first Tagalog clip, between the 4-bit 79% and the full 8-bit 29%, so the text part matters most. Neither the all-8-bit nor the audio-only run was repeated on a quiet machine.
- **Not measured:** farm words (FLEURS is Wikipedia sentences, and this machine has no Tagalog or Cebuano voice to make farm sentences), real farmers' voices, phone microphones, noise, and Taglish. Collect real recordings with the correct text, put them in `eval/voice-clips/<config>/` in the same layout, and run `pnpm eval:voice` again.

## How matching and Gemma split the work

The matcher (keyword, Laya, or `hybrid`) decides which problem it is and whether it is sure. Gemma only explains that decision in Taglish. It does not diagnose. One exception: in `hybrid` mode on the llama.cpp route, when keyword is not sure, Gemma first turns the farmer's words into one or two plain English sentences, and keyword and Laya match those. Gemma does not name a problem in that step, and the English is logged. The same rule holds on the phone, where keyword matching decides. See `answerQuestion` in `hub/src/answer.ts` and `buildMessages` and `notesToExplain` in `shared/src/prompt.ts`.

### Languages and reworded questions

Farmers can ask in Tagalog, Taglish, Cebuano (Bisaya), or English, in their own words. Bisaya here means Cebuano, including Cebuano mixed with English. Two things make that work:

- **Keywords in all four.** Each `knowledge/*.json` entry lists sign phrases in English, Tagalog, and Cebuano, for example `dali ra ibton` and `madaling hilahin` ("pulls out easily") for stem borer. This runs on the phone too, offline.
- **Gemma's English (hub, `hybrid`, llama.cpp route).** When keyword is not sure, Gemma rewrites the question as plain English signs (`DESCRIBE_SYSTEM_PROMPT` in `shared/src/prompt.ts`). The prompt carries a short Tagalog and Cebuano farm glossary, because Gemma E2B read `humay` (rice) as corn without it. Gemma runs this on its own llama.cpp sequence, so neither job loses its cached prompt. It took about 0.3 to 0.5 s per question in the eval.

Two rules keep Gemma's English from causing wrong answers (`hub/src/matchers/hybrid.ts`). On the English, keyword needs at least two distinct keywords for a clear answer (`minScore: 2`), so one word Gemma got wrong cannot decide. And Laya may only pick a problem that keyword also found, because Laya is confident even on "no signs given". Anything else is "not sure", and the farmer is told to call the agriculturist. Gemma still answers in Taglish whatever the question's language.

| Matcher verdict | What Gemma gets | What Gemma writes |
| --- | --- | --- |
| Sure | The top problem's note only, marked "sure" | Explains that problem in numbered steps |
| Not sure | Every candidate note (at most two), marked "not sure" | Says in one sentence what is unclear, then asks one question about the signs that tell the candidates apart. No steps |
| Best guess (two questions in a row with no clear match) | The top note only, marked "best guess" | Says it is the most likely problem but not certain, gives its first steps, and asks nothing |
| No match, or small talk | The chat: the farmer's earlier symptom messages and the last few turns | Replies to what the farmer said and asks one question. Never names a problem |

The verdict goes in the user message, not the system prompt, so llama.cpp keeps reusing its cached system prompt.

### Guardrail rails

Two rails, borrowed from how open-source guardrail libraries (NVIDIA NeMo Guardrails, Meta Llama Guard and Prompt Guard) split the work. Both are plain rules in `shared/src/rails.ts`, so they run on the phone and the hub, offline.

- **Input rail.** A message that tries to change the helper's rules, show its instructions, or make it play another role ("ignore previous instructions", "kalimutan mo ang mga panuto") goes to the chat with a fixed reply. It is not matched, no photo is read, and the model never sees it, even when it also has a symptom word in it. The prompts also tell the model the farmer's message is data, not orders.
- **Grounding rail.** A reply may name only the problems it was given notes for. If the hub's or phone's model names another problem from `knowledge/` (the farmer's own wording excepted), the reply is dropped like a pesticide violation and the curated notes show instead. The hub logs a `guardrail` event with the names. A chat reply with no notes may name none.
- **Guardrail wording.** The brand and dosage check also catches caps, drops, cups, sachets, ppm, and a mix rate per tank with no number ("kada tangke").

### How the chat works

- **Small talk goes to the chat, not to matching.** A greeting, thanks, a request for help, or a complaint about an earlier answer gets a reply to what the farmer said. A message with a symptom in it is matched even when it starts with "hello po".
- **Matching reads the whole chat.** The phone sends a `sessionId` (one per chat, reset by "Bagong usapan") and its history. The hub keeps each chat's symptom messages in memory for six hours and matches on all of them, so "may butas po siya" after "may mali sa palay ko" is read as rice. If the hub has no record of a chat, it rebuilds it from the history the phone sends.
- **One question per reply.** The hub keeps the first question in a reply and drops the rest. After two questions in a row with no clear match, the reply gives its best answer and says what is uncertain.
- **A match is shown as "Tugma" only when it is sure.** The card names the symptom words it matched on ("Dahil sa").

The logic lives in `shared/src/conversation.ts` (routing, session text, the one-question rule, the notice rule) and `hub/src/conversation/state.ts` (the per-chat state).

## Device tiers

| Tier | Who | What runs | Offline |
| --- | --- | --- | --- |
| Phone core | Any phone with a browser | Keyword matching, curated notes, and disclaimer. No model download. | Yes |
| Phone AI | A phone whose browser reports at least 8 GB of memory (or does not say). WebGPU is preferred; WebAssembly is the slower fallback. The repo has no phone test. | Gemma 4 E2B (with vision) and Laya in the browser, after a first download of about 3.4 GB and 1.7 GB from the hub's Wi-Fi. The phone reads photos and matches with the hub's hybrid rules; Gemma explains only the match the matcher chose. | Once loaded on that phone. Whether the browser keeps the download across visits is not checked. |
| Village hub | Cooperative or barangay members | Keyword matching by default. Optional Laya matching and optional Gemma 4 E2B explanation (E4B not run). | Yes, on the local network |

Questions the phone does not answer itself queue on the phone. The app sends them when it starts, when the browser fires an online event, when the farmer taps **Ipadala ngayon** in Mga setting, or after a new question when the hub answers its health check. Nothing polls for the hub's Wi-Fi. A question the phone AI answers is marked answered only when generation finishes, and a sync that runs during generation can still send it to the hub (see Known issues). The phone uses keyword matching only; Laya runs on the hub.

No single phone runs the full model, so the plan does not promise AI on every phone.

## Commands

From the repository root:

| Command | What it does |
| --- | --- |
| `pnpm install` | Installs all workspace packages. Commit `pnpm-lock.yaml`. |
| `pnpm dev` | Starts the web app. |
| `pnpm build` | Builds shared, web, and hub. |
| `pnpm test` | Builds, then runs all tests. |
| `pnpm eval:voice` | Scores the hub's speech writing on recordings with the correct text: word and character error rate per language. Needs clips (see "Voice") and `GEMMA_MODEL_DIR`. Add `-- --dtype quantized` to compare weights. |
| `pnpm eval` | Scores keyword matching on `eval/descriptions.csv`. Also scores Laya and hybrid when `LAYA_MODEL_DIR` is set (nothing is downloaded). Pass `-- --file <name>` to score another CSV in `eval/`. Add `--describe` to also score hybrid with Gemma's English first (needs `GEMMA_GGUF`). The `lang` column is `en`, `tl`, `taglish`, or `ceb` (Cebuano/Bisaya). |

`make install`, `make build`, and `make test` call the same pnpm commands. They need GNU make on the PATH, which Windows does not include by default.

Package-level scripts are `dev`, `build`, `preview`, and `test` in `web/`, and `dev`, `build`, `start`, `eval`, and `test` in `hub/`.

Hub tests load `hub/.env`; shared and web tests do not. A machine-specific `hub/.env` therefore changes the hub test run, where the real-model tests run when their model paths are set.

## Add a knowledge entry

Each problem is one file in `knowledge/`, named `<id>.json`.

1. Copy an existing file and set `id` to match the file name. Use lowercase words joined by hyphens.
2. Set `crop` to `"rice"` or `"corn"`.
3. Write `keywords` in English, Tagalog, and Cebuano (Bisaya). Use the words farmers actually say, and prefer phrases of two or more words for signs. A single common word like "pale" or "amag" gives a clear answer on its own and can be wrong. Matching is by whole word or phrase, and it is case-insensitive, with accents ignored.
4. Write `signs` (what the farmer sees), `actions` (field steps), and `callExpertIf` (when to call the agriculturist now).
   If the problem is an insect, also add an `insect` profile: `commonName`, `scientificName`, `localNames` (only names a source confirms), `stages` (`vegetative`, `reproductive`, `ripening`), `stageNote`, and `biological` (natural enemies, never a pesticide). Use `actions` for the cultural and mechanical steps. The answer then names the insect, says which crop and stage it attacks, lists natural enemies, and ends with "pesticide is the last option, with protective gear". Matching also counts the insect's own names (common, scientific, local) double, and a name inside a longer name another entry matched does not count (so "atangya" does not steal "itim na atangya"). Add the new id to `INSECT_IDS` in `shared/test/insect.test.ts`.
5. Never name a pesticide brand or give a dosage in any field. The tests fail if you do.
6. Leave `reviewedBy` and `reviewedOn` empty.
7. Run `pnpm test`. The schema and guardrail tests check the file.
8. Add two or three labeled farmer descriptions to `eval/descriptions.csv` (text, expectedId, lang), then run `pnpm eval`. Insect notes added with a profile have theirs in `eval/descriptions-insects.csv` (`pnpm eval -- --file descriptions-insects.csv`); the hub's example test reads both files.

**Agronomist review.** An agronomist checks the notes and the wording. When they sign off, set `reviewedBy` to their name and `reviewedOn` to the date as `YYYY-MM-DD`. The test rejects a `reviewedBy` with no date. Do not fill these fields in on someone's behalf.

## Pending decisions

These need a person to decide. The code does not guess them.

- **Gemma loader (web): changed 2026-10-10.** The app now uses the card's `Gemma4ForConditionalGeneration` loader (about 3.4 GB at q4f16) so the phone reads photos; the text-only `Gemma4ForCausalLM` (about 3.1 GB) could not. The audio graph is downloaded too but voice still goes through the hub. See `web/src/workers/llm.worker.ts`.
- **Gemma on the hub: runs on the GPU.** `HUB_EXPLAINER=gemma` runs the local Gemma 4 E2B GGUF (Q4_0) through llama.cpp on the GPU (Vulkan on the dev laptop's RTX 4060): five test questions took 1.1 to 2.3 s each per `/ask`, matching included (one run took 18.5 s). The pesticide guardrail still runs on its text. The ONNX CPU route (`GEMMA_RUNTIME=onnx`, 12 s to 1 minute) is kept as a fallback. Not yet run: a hub without an NVIDIA GPU, the CUDA backend, the Q8_0 file, and the E4B model.
- **Laya pass mark and confidence threshold.** The hub will not start with `laya` or `hybrid` until `LAYA_PASS_MARK` and `LAYA_CONFIDENCE_THRESHOLD` are set, and the team has not chosen them yet. Laya has no abstain option, so the confidence threshold is the only "not sure" gate. The hub only checks that the pass mark is set; `pnpm eval` uses its value for a pass or fail verdict. The dev laptop's `hub/.env` sets 0.3 and 0.5, and `pnpm eval` reads them. With neither set, the threshold is 0 and no verdict prints. Results with `pnpm eval` at threshold 0.3 and the default criteria, from saved runs:
  - `eval/descriptions.csv` (27 rows, saved run `2026-10-09T09-59-11`, after the option-text fix): keyword 26 right, no wrong answers. Laya 17 right, no wrong, 10 not sure. Hybrid 26 right, no wrong. Before the fix Laya got 11 right, because the option text was cut short (see "Laya bundle").
  - `eval/descriptions-paraphrase.csv` (31 farmer-style rows written for this test, not yet reviewed by an agriculturist; saved run `2026-10-09T08-36-07`): keyword 20 right, Laya 12 right, hybrid 21 right. None of the three gave a wrong answer, and hybrid passes the verdict here.

  Laya alone never passes. Hybrid ties keyword on the 27-row set, so it does not pass there. Keyword stays the default. The 0.3 threshold came from the 27-row confidences (2026-10-09 option-text note), so the Laya numbers on that set are optimistic. The holdout sets are not final: `eval/descriptions-holdout.csv` and `eval/descriptions-holdout2.csv` are uncommitted and still being written, and keyword phrases in the knowledge base were edited after the first holdout was written. Do not quote their scores until the sets are frozen. A bad bundle path with `HUB_LAYA_FALLBACK=keyword` falls back to keyword matching (`hub/src/main.ts`), but no test covers that path.
- **Laya in Tagalog.** The default bundle is English-only (about 1.69 GB). It got 4 of 19 Tagalog rows right across both labeled sets and answers "not sure" on most of the rest. The checkpoint's `multilingual/` folder (mmBERT, 100+ languages) was exported to ONNX on 2026-10-09 (1.29 GB, one `laya.onnx` file; it loads only with `patches/@receptron__laya@0.1.2.patch`, which accepts its `<bos>`/`<eos>`/`<mask>`/`<pad>` token names). It scored worse with the current knowledge text: 1 of 19 Tagalog rows right, and it is overconfident (its calibration temperatures are all 1.0), giving 28 confident wrong answers against 16 right (12 of 27 rows and 4 of 31) at threshold 0.3. Do not use it yet. The next step is adding Tagalog wording to the knowledge entries, then re-running `pnpm eval` with both bundles.
- **Languages: Tagalog, Taglish, Cebuano (Bisaya), English.** Added 2026-10-09 (Cebuano and Tagalog keywords, Gemma's English before matching). `pnpm eval -- --file <set> --describe`, threshold 0.3, all rows written by the developer and not reviewed by an agriculturist or a native Cebuano speaker:
  - Before the change, on `eval/descriptions-holdout2.csv` (36 rows, 9 per language, written before any keyword or prompt change for this): keyword 50.0% right, 5.6% wrong. Hybrid 52.8% right, 8.3% wrong.
  - After: keyword alone 91.7% right, no wrong (this is the phone's offline matching). Hybrid with Gemma's English 97.2% right, no wrong, 1 not sure.
  - The same run on the other sets: `descriptions.csv` 27 of 27, `descriptions-paraphrase.csv` 31 of 31, `descriptions-holdout.csv` (53 rows, including 18 Cebuano) 52 of 53. None wrong. Keywords were tuned on these three sets, so these numbers are optimistic.
  - holdout2 is only partly blind. Its keyword and glossary tuning used the other sets, but its baseline was run first, and the rule that Laya must agree with keyword was added after its first run (34 of 36 right, 2 wrong). Before trusting the numbers, write a fresh set with native speakers, Cebuano especially.
  - Gemma's answer stays Taglish for every language. Whether Cebuano farmers should get Cebuano answers is a team decision.
- **Hub network.** A web app served over https cannot call a plain-http hub on the LAN (browsers block it as mixed content). Options: serve the app from the hub, or give the hub a trusted https address.
- **Node version.** Node 20 reached end of life on 2026-04-30. Plan on Node 22 or 24. The hub itself needs Node 20.12 or later (`process.loadEnvFile`). The `engines` fields in `package.json` and `hub/package.json` still say `>=20`, which also allows 20.0 to 20.11; changing them is a team decision.
- **Voice accuracy.** Measured only on read Wikipedia sentences (see "How well it writes Tagalog and Cebuano"): about 8% character error in Tagalog and 11% in Cebuano with the default weights, from two clips each. Not measured on farm words, real farmers, phone microphones, noise, or Taglish. Before the farmers rely on it: record real farmers on real phones (quiet and noisy, short and long), write the correct text by hand, and score it with `pnpm eval:voice`. Decide whether the 3 GB extra memory for 8-bit weights is worth it on the hub machine, and whether the 30-second limit is enough.
- **Photo accuracy.** Nobody has measured how well Gemma's description of a real photo leads to the right problem. Before the farmers rely on it: collect labeled field photos (rice and corn, each problem in `knowledge/`, plus healthy plants and non-crop photos), run them through `/ask`, and score `photo` and `matchIds`. Decide whether the 280-token limit is acceptable, whether the E4B model (not run) is worth the extra time, and whether a hub without a spare CPU should leave `HUB_VISION` off.
- **Remote repository.** `origin` is set to `https://github.com/LeinahI/appbuildersph-notskramz.git`. Whether that is the team's shared repo is not recorded here.

## Limits

- This is a guide, not a diagnosis. A photo only adds signs for the matcher to read. The app does not identify a disease from a photo by itself, and photo reading has not been tested on real field photos.
- The knowledge notes are a starting set. They are not yet reviewed by an agronomist.
- Model answers can be wrong. The app shows the curated notes next to the AI text so the farmer can check them.
- The eval set is written by the developer, not labeled by an agronomist. Its scores are optimistic.

## Known issues

- **Photos are slow on a busy CPU.** Reading one takes about 30 s when the hub machine is idle, and minutes when other programs use the CPU. The first photo after a restart waits for the model to load. A photo question sent while the hub restarts is lost on the hub side and stays queued on the phone until the next sync.
- **Phone AI retry.** After a load error the **Ihanda ang AI** button comes back, but tapping it does nothing until the page is reloaded. The worker is kept after an error (`web/src/lib/llm.ts`).
- **Phone AI and sync.** A question the phone AI answers is marked answered only when generation finishes. A sync that runs during generation (Ipadala ngayon, or an online event) can still send it to the hub, and a failed generation stays queued for the next sync. The app has no status that keeps it out of the sync yet.
- **Laya errors.** A failure after startup is not retried on the CPU. In `laya` mode `/ask` returns an error. In `hybrid` mode the hub returns keyword's candidates marked not sure, or no match, and logs nothing.
- **Browser voice input needs a network.** Typing works offline. With `HUB_VOICE` off, or when the hub cannot be reached, the mic button uses the Web Speech API, which in Chrome sends speech to a browser service (`web/src/components/VoiceInput.tsx`). With the hub's voice on and reachable, the mic works offline.
- **Offline phone AI is not yet tested.** The model weights and the ONNX runtime files are cached after the first online load, but a network-off reload has not been run on the demo laptop. See [docs/DEMO.md](docs/DEMO.md).
- **Startup time.** With Gemma on, the hub takes about 40 to 50 s to start listening on the dev laptop (measured 2026-10-09, see `docs/agent-notes/`). Laya's load time adds to that when `laya` or `hybrid` is set, and it has not been measured.

## License

Code: MIT (see `LICENSE`). Model weights are not covered by this license. Each model's license is listed in `docs/DISCLOSURE.md`.
