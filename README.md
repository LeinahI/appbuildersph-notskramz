# Ugatan

Offline Taglish advisor for Filipino rice (palay) and corn (mais) farmers. A farmer describes what they see in the field, and the app matches it to a likely pest or disease, shows the signs, lists field steps, says when to call an expert, and explains the result in Taglish. It never names pesticide brands or gives dosages. Every answer ends with: "Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide."

Read [docs/BUSINESS-PLAN.md](docs/BUSINESS-PLAN.md) for the plan and [docs/DISCLOSURE.md](docs/DISCLOSURE.md) for models, licenses, and library versions.

## Layout

| Folder | What it is |
| --- | --- |
| `web/` | React + Vite + TypeScript PWA. Static. Runs offline on any phone. |
| `hub/` | Node.js TypeScript service for a cooperative or barangay office. Answers `POST /ask` on the local network. |
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

Open http://localhost:5173. Keyword matching works right away. Offline reloads (no network after the first load) apply to the built site, not to `pnpm dev`, where the service worker is off.

The phone AI runtime is optional. The simplified home page currently has no model-preparation control; keyword matching and curated notes work without it. Preparing the runtime downloads Gemma 4 E2B (`onnx-community/gemma-4-E2B-it-ONNX`, q4f16, text-only) from Hugging Face. It is about 3.1 GB, so the first time it needs a network. The phone tries WebGPU first and falls back to WebAssembly on the CPU, which is slower. The model is held in memory, so a page reload starts at idle and the button shows again.

To point the app at a hub, set `VITE_HUB_URL` in `web/.env.local` (copy `web/.env.example`). `VITE_HUB_URL` is built into the app, so restart the dev server or rebuild after changing it. A previously saved address on that phone still overrides it. The home page no longer exposes hub settings or manual sync controls.

Build and preview the static site. The repo does not yet set up how phones load this built site over Wi-Fi (see Pending decisions, hub network):

```bash
pnpm build
pnpm --filter @ugatan/web preview
```

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

The hub starts listening after each model load has finished, whether it succeeded or failed. A failed Gemma load is logged, and the hub answers without an explanation. A failed Laya load falls back to keyword matching, unless `HUB_LAYA_FALLBACK` is set to something other than `keyword`, in which case the hub exits. With Gemma on, the loads take about 40 to 50 s on the dev laptop (measured 2026-10-09, see `docs/agent-notes/`); the Laya load time has not been measured.

Check it with `curl http://<laptop-ip>:8787/health`. It reports `ok` and the matcher and explainer it is running, so confirm they match your settings. If phones cannot reach it, allow Node.js through Windows Firewall on private networks, on the `HUB_PORT` (default 8787). Pilot logs go to `hub/logs/` when you start the hub from `hub/` (one `.jsonl` file per day, one JSON line per event, kept off git).

With no settings, the hub runs keyword matching with no AI explanation. Laya and the Gemma explanation are off until you set them (see "Gemma on the hub" and "Pending decisions" below).

## Laya bundle

Laya is optional and off by default (`HUB_MATCHER=keyword`). Set `HUB_MATCHER=laya` to use Laya for every question, or `HUB_MATCHER=hybrid` to answer with keyword matching when keyword is sure and ask Laya only when it is not. Either one also needs `LAYA_PASS_MARK` and `LAYA_CONFIDENCE_THRESHOLD`. Keyword stays the default because Laya does not yet pass the team's labeled-test criteria (see Pending decisions).

The hub loads an ONNX bundle with these files: `laya.onnx`, `laya.onnx.data`, `laya_config.json`, and `tokenizer/` (`tokenizer.json`, `tokenizer_config.json`). Keep `laya.onnx.data` next to `laya.onnx`. There are two ways to get the bundle:

- **Default: download.** With `LAYA_MODEL_DIR` unset, the hub downloads the English bundle from Hugging Face (`receptron/laya-onnx`, about 1.69 GB) into `LAYA_CACHE` (default `.laya-cache`) on the first start. Later starts reuse that cache and work offline.
- **Build your own.** Build the bundle from the Convai checkpoint (steps 1 to 3 below), then point `LAYA_MODEL_DIR` at it. Nothing is downloaded when it is set.

The Hugging Face checkpoint `convaiinnovations/laya` is PyTorch, so it must be exported first. Build it on the hub machine:

1. Download `convaiinnovations/laya` (Apache-2.0 per its model card) into a local folder, for example `E:\models\laya`. The download step is in the [receptron/laya](https://github.com/receptron/laya) README.
2. Export it with `export/export_onnx.py` from [receptron/laya](https://github.com/receptron/laya) (MIT). Use Python 3.12 with `torch`, `transformers` 5.x, `safetensors`, `onnx`, `onnxscript`, `onnxruntime`, and `huggingface_hub`. On Windows, set `PYTHONUTF8=1` first.

   ```bash
   python export_onnx.py E:/models/laya E:/models/laya-onnx
   ```

3. Point the hub at the bundle with `LAYA_MODEL_DIR`. Nothing is downloaded when it is set. In PowerShell: `$env:LAYA_MODEL_DIR = "E:/models/laya-onnx"`.

Check the bundle by running the hub tests with `LAYA_MODEL_DIR` set. In PowerShell: `$env:LAYA_MODEL_DIR = "E:/models/laya-onnx"; pnpm --filter @ugatan/hub test`. Without `LAYA_MODEL_DIR` the Laya tests are skipped. Score the bundle with `pnpm eval`.

Laya runs on the GPU through onnxruntime's WebGPU backend by default (`LAYA_DEVICE=webgpu`): about 0.1 s per question on the dev laptop against about 1 s on the CPU, with the same `pnpm eval` results (a 2026-10-09 benchmark of six questions, see `docs/agent-notes/`). At startup the hub asks Laya one warm-up question. If WebGPU fails to load (including that warm-up), it logs a warning and uses the CPU. A failure on a later question is not retried on the CPU: in `hybrid` mode the hub answers with keyword matching, and in `laya` mode `/ask` returns an error. Set `LAYA_DEVICE=cpu` to skip the GPU. In the same benchmark, DirectML loaded but failed on the first answer.

Laya has a 192-token budget per question. Each option text is capped at 48 tokens. When the option texts together need more than 176 tokens, each option gets an equal share (176 divided by the number of options, rounded down), and the cut happens silently. With all 8 problems as options, the cut is in effect; the 2026-10-09 option-text note records 22 tokens per option. Keep option text short and never put the id in it (see `problemOptions` in `hub/src/matchers/laya.ts`). Check any change to the options or to the knowledge base with `pnpm eval`.

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
| Not sure | Every candidate note (at most two), marked "not sure" | Says it is not sure, names the signs that tell the candidates apart, and says to call the agriculturist |
| No match | Nothing. The hub skips Gemma (logged as `skipped-no-match`) | Nothing. The phone shows its own no-match line |

The verdict goes in the user message, not the system prompt, so llama.cpp keeps reusing its cached system prompt.

## Device tiers

| Tier | Who | What runs | Offline |
| --- | --- | --- | --- |
| Phone core | Any phone with a browser | Keyword matching, curated notes, and disclaimer. No model download. | Yes |
| Phone AI | Any phone browser can try. WebGPU is preferred; WebAssembly is the slower fallback. The code has no device check, and the repo has no phone test. | Gemma 4 E2B in the browser, after a first download of about 3.1 GB (estimate from a code comment). The phone explains only the match that keyword matching chose. | Once loaded on that phone. Whether the browser keeps the download across visits is not checked. |
| Village hub | Cooperative or barangay members | Keyword matching by default. Optional Laya matching and optional Gemma 4 E2B explanation (E4B not run). | Yes, on the local network |

Questions the phone does not answer itself queue on the phone. The app sends them when it starts, when the browser fires an online event, or after a new question when the hub answers its health check. Nothing polls for the hub's Wi-Fi. A question the phone AI answers is marked answered only when generation finishes, and a sync that runs during generation can still send it to the hub (see Known issues). The phone uses keyword matching only; Laya runs on the hub.

No single phone runs the full model, so the plan does not promise AI on every phone.

## Commands

From the repository root:

| Command | What it does |
| --- | --- |
| `pnpm install` | Installs all workspace packages. Commit `pnpm-lock.yaml`. |
| `pnpm dev` | Starts the web app. |
| `pnpm build` | Builds shared, web, and hub. |
| `pnpm test` | Builds, then runs all tests. |
| `pnpm eval` | Scores keyword matching on `eval/descriptions.csv`. Also scores Laya and hybrid when `LAYA_MODEL_DIR` is set, or with `--allow-download`. Pass `-- --file <name>` to score another CSV in `eval/`. Add `--describe` to also score hybrid with Gemma's English first (needs `GEMMA_GGUF`). The `lang` column is `en`, `tl`, `taglish`, or `ceb` (Cebuano/Bisaya). |

`make install`, `make build`, and `make test` call the same pnpm commands. They need GNU make on the PATH, which Windows does not include by default.

Package-level scripts are `dev`, `build`, `preview`, and `test` in `web/`, and `dev`, `build`, `start`, `eval`, and `test` in `hub/`.

Hub tests load `hub/.env`; shared and web tests do not. A machine-specific `hub/.env` therefore changes the hub test run, where the real-model tests run when their model paths are set.

## Add a knowledge entry

Each problem is one file in `knowledge/`, named `<id>.json`.

1. Copy an existing file and set `id` to match the file name. Use lowercase words joined by hyphens.
2. Set `crop` to `"rice"` or `"corn"`.
3. Write `keywords` in English, Tagalog, and Cebuano (Bisaya). Use the words farmers actually say, and prefer phrases of two or more words for signs. A single common word like "pale" or "amag" gives a clear answer on its own and can be wrong. Matching is by whole word or phrase, and it is case-insensitive, with accents ignored.
4. Write `signs` (what the farmer sees), `actions` (field steps), and `callExpertIf` (when to call the agriculturist now).
5. Never name a pesticide brand or give a dosage in any field. The tests fail if you do.
6. Leave `reviewedBy` and `reviewedOn` empty.
7. Run `pnpm test`. The schema and guardrail tests check the file.
8. Add two or three labeled farmer descriptions to `eval/descriptions.csv` (text, expectedId, lang), then run `pnpm eval`.

**Agronomist review.** An agronomist checks the notes and the wording. When they sign off, set `reviewedBy` to their name and `reviewedOn` to the date as `YYYY-MM-DD`. The test rejects a `reviewedBy` with no date. Do not fill these fields in on someone's behalf.

## Pending decisions

These need a person to decide. The code does not guess them.

- **Gemma loader (web): decided.** The app uses the text-only `Gemma4ForCausalLM` loader, about 3.1 GB at q4f16. The card's `Gemma4ForConditionalGeneration` also downloads the vision and audio files (about 3.4 GB). This departs from the spec's "card loader" rule, and the team approved it. Image and audio input are later phases. See `web/src/workers/llm.worker.ts`.
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
- **Remote repository.** `origin` is set to `https://github.com/LeinahI/appbuildersph-notskramz.git`. Whether that is the team's shared repo is not recorded here.

## Limits

- This is a guide, not a diagnosis. It cannot identify a disease from a photo in this version.
- The knowledge notes are a starting set. They are not yet reviewed by an agronomist.
- Model answers can be wrong. The app shows the curated notes next to the AI text so the farmer can check them.
- The eval set is written by the developer, not labeled by an agronomist. Its scores are optimistic.

## Known issues

- **Phone AI retry.** After a load error the runtime cannot retry until the page is reloaded. The worker is kept after an error (`web/src/lib/llm.ts`).
- **Phone AI and sync.** A question the phone AI answers is marked answered only when generation finishes. A sync that runs during generation (for example, an online event) can still send it to the hub, and a failed generation stays queued for the next sync. The app has no status that keeps it out of the sync yet.
- **Laya errors.** A failure after startup is not retried on the CPU. In `laya` mode `/ask` returns an error. In `hybrid` mode the hub returns keyword's candidates marked not sure, or no match, and logs nothing.
- **Startup time.** With Gemma on, the hub takes about 40 to 50 s to start listening on the dev laptop (measured 2026-10-09, see `docs/agent-notes/`). Laya's load time adds to that when `laya` or `hybrid` is set, and it has not been measured.

## License

Code: MIT (see `LICENSE`). Model weights are not covered by this license. Each model's license is listed in `docs/DISCLOSURE.md`.
