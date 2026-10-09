# Ugatan

Offline Taglish advisor for Filipino rice (palay) and corn (mais) farmers. A farmer describes what they see in the field, and the app matches it to a likely pest or disease, shows the signs, lists field steps, says when to call an expert, and explains the result in Taglish. It never names pesticide brands or gives dosages. Every answer ends with: "Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide."

Read [docs/BUSINESS-PLAN.md](docs/BUSINESS-PLAN.md) for the plan and [docs/DISCLOSURE.md](docs/DISCLOSURE.md) for models, licenses, and library versions.

## Layout

| Folder | What it is |
| --- | --- |
| `web/` | React + Vite + TypeScript PWA. Static. Runs offline on any phone. |
| `hub/` | Node.js 20+ TypeScript service for a cooperative or barangay office. Answers `POST /ask` on the local network. |
| `shared/` | Matcher, knowledge validation, pesticide guardrail, and answer composition, used by web and hub. |
| `knowledge/` | Curated problems, one JSON file each. |
| `eval/` | Labeled farmer descriptions and the script that scores keyword matching and Laya. |
| `docs/` | Disclosure and business-plan link. |

## Run the web app

You need Node 20 or newer and pnpm 10. Use pnpm for every install. Do not use npm.

```bash
corepack enable
pnpm install
pnpm dev
```

Open http://localhost:5173. Keyword matching works right away, with no network needed after the first load. To make the phone AI available, tap **Ihanda ang AI**. That downloads the model once, and it is large (see device tiers below). To point the app at a hub, set `VITE_HUB_URL` in `web/.env.local` (copy `web/.env.example`), or type the hub address in the app.

Build and preview the static site:

```bash
pnpm build
pnpm --filter @ugatan/web preview
```

## Run the hub

The hub runs on a laptop on the same Wi-Fi as the phones.

```bash
pnpm install
pnpm --filter @ugatan/hub build
pnpm --filter @ugatan/hub start
```

The hub reads its settings from environment variables. It does not read a `.env` file. Set the values listed in `hub/.env.example` in your shell before you start it. For example, in PowerShell: `$env:HUB_PORT = "8787"`.

Check it with `curl http://<laptop-ip>:8787/health`. Pilot logs go to `hub/logs/` (one JSON file per day, kept off git).

With no settings, the hub runs keyword matching with no AI explanation. Laya and the Gemma explanation are not switched on yet. See "Pending decisions" below.

## Device tiers

| Tier | Who | What runs | Offline |
| --- | --- | --- | --- |
| Phone core | Any phone with a browser | Keyword matching, curated notes, and disclaimer. No model download. | Yes |
| Phone AI | Phones that can run a small model with WebGPU | Gemma 4 E2B in the browser, after a one-time download of several GB. | Yes, after download |
| Village hub | Cooperative or barangay members | Laya matching and a Gemma 4 E4B explanation on the hub. Questions queue on the phone and send when it reaches hub Wi-Fi. | Yes, on the local network |

No single phone runs the full model, so the plan does not promise AI on every phone.

## Commands

From the repository root:

| Command | What it does |
| --- | --- |
| `pnpm install` | Installs all workspace packages. Commit `pnpm-lock.yaml`. |
| `pnpm dev` | Starts the web app. |
| `pnpm build` | Builds shared, web, and hub. |
| `pnpm test` | Builds, then runs all tests. |
| `pnpm eval` | Scores keyword matching and Laya on `eval/descriptions.csv`. |

`make install`, `make build`, and `make test` call the same pnpm commands. They need GNU make on the PATH, which Windows does not include by default.

Package-level scripts are `dev`, `build`, `preview`, and `test` in `web/`, and `dev`, `build`, `start`, `eval`, and `test` in `hub/`.

## Add a knowledge entry

Each problem is one file in `knowledge/`, named `<id>.json`.

1. Copy an existing file and set `id` to match the file name. Use lowercase words joined by hyphens.
2. Set `crop` to `"rice"` or `"corn"`.
3. Write `keywords` in English and Tagalog. Use the words farmers actually say. Matching is by whole word or phrase, and it is case-insensitive, with accents ignored.
4. Write `signs` (what the farmer sees), `actions` (field steps), and `callExpertIf` (when to call the agriculturist now).
5. Never name a pesticide brand or give a dosage in any field. The tests fail if you do.
6. Leave `reviewedBy` and `reviewedOn` empty.
7. Run `pnpm test`. The schema and guardrail tests check the file.
8. Add two or three labeled farmer descriptions to `eval/descriptions.csv` (text, expectedId, lang), then run `pnpm eval`.

**Agronomist review.** An agronomist checks the notes and the wording. When they sign off, set `reviewedBy` to their name and `reviewedOn` to the date as `YYYY-MM-DD`. The test rejects a `reviewedBy` with no date. Do not fill these fields in on someone's behalf.

## Pending decisions

These need a person to decide. The code does not guess them.

- **Gemma loader (web): decided.** The app uses the text-only `Gemma4ForCausalLM` loader, about 3.1 GB at q4f16. The card's `Gemma4ForConditionalGeneration` also downloads the vision and audio files (about 3.4 GB). This departs from the spec's "card loader" rule, and the team approved it. Image and audio input are later phases. See `web/src/workers/llm.worker.ts`.
- **Gemma E4B on the hub.** No Node.js route has been run. The static analysis predicts q4f16 fails on the CPU. `HUB_EXPLAINER=gemma-e4b` stops the hub with a message until a route is chosen.
- **Laya pass mark and confidence threshold.** `LAYA_PASS_MARK` and `LAYA_CONFIDENCE_THRESHOLD` are required before the hub will use Laya. Laya has no abstain option, so the confidence threshold is the only "not sure" gate.
- **Laya in Tagalog.** The default bundle is English-only (about 1.69 GB). The multilingual bundle is not published in the package's repository, so its path is unverified.
- **Hub network.** A web app served over https cannot call a plain-http hub on the LAN (browsers block it as mixed content). Options: serve the app from the hub, or give the hub a trusted https address.
- **Node version.** Node 20 reached end of life on 2026-04-30. Plan on Node 22 or 24.
- **Remote repository.** Not created. This repo has no remote yet.

## Limits

- This is a guide, not a diagnosis. It cannot identify a disease from a photo in this version.
- The knowledge notes are a starting set. They are not yet reviewed by an agronomist.
- Model answers can be wrong. The app shows the curated notes next to the AI text so the farmer can check them.
- The eval set is written by the developer, not labeled by an agronomist. Its scores are optimistic.

## License

Code: MIT (see `LICENSE`). Model weights are not covered by this license. Each model's license is listed in `docs/DISCLOSURE.md`.
