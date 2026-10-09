# Update the README to match the local AI setup

- Date: 2026-10-09
- Agent: Claude Haiku 5.5
- Status: done

## Task
Update the README so it says what local AI the project uses (phone Gemma, hub Laya, hub Gemma) and the setup steps that go with it.

## What changed
- [README.md](../../README.md): setup order (`pnpm build` before the hub, `cp` of `hub/.env`), startup refusals, what happens when a model fails to load, Laya bundle sources (default download from `receptron/laya-onnx` into `LAYA_CACHE`, or `LAYA_MODEL_DIR`), the Laya 192-token rule, the Gemma llama.cpp and ONNX routes, the hybrid describe step, phone sync triggers, eval commands, pending decisions with dated saved-run numbers, and a new "Known issues" section.
- Other files: none. Home.md gets one line under Agent notes.

## Decisions
- Targeted edits, not a rewrite. README.md had uncommitted text from another session (the "How matching and Gemma split the work" section and the Laya WebGPU paragraph). Kept it and corrected it.
- Numbers come from saved eval runs in `eval/results/`. Removed the 24-row figures and the 40.7% "latest" wording: no repo file reproduces the 24-row set, and the 40.7% run predates the option-text fix.
- Holdout scores are not quoted. Keyword phrases in `knowledge/*.json` were edited after the holdout set was written, so keyword and hybrid scores on it no longer test unseen wording.
- Node: the hub needs 20.12 or later (`process.loadEnvFile`). The README says 22 or 24, as the team plans. `engines` is unchanged.
- Speed and GPU figures that come only from agent notes are labeled as measured on 2026-10-09.

## Verification
- Survey: four read-only agents covered hub Gemma, hub Laya, the phone model, and a docs audit against the code.
- Adversarial check: three verifiers tried to refute each claim against the code. Corrections applied: hub listen order, keyword works under `pnpm dev` only without the offline claim, Laya token rule, Gemma trim rule, hybrid describe step, phone sync triggers and the sent-to-hub gap, eval threshold source, Tagalog counts, and hybrid passing on the paraphrase set.
- `pnpm eval -- --file descriptions-holdout.csv` run from the repo root: works. Wrote `eval/results/run-2026-10-09T10-03-04-412Z.json` (gitignored).
- Not run: `pnpm build`, `pnpm test`, the hub start, and the phone AI in a browser.

## Follow-ups
- [docs/DISCLOSURE.md](../DISCLOSURE.md) is out of date. It has no row for the GGUF model (`ggml-org/gemma-4-E2B-it-GGUF`) or for `node-llama-cpp`. It lists `@huggingface/transformers` as web-only and `onnxruntime-node` as used through Laya. The AI coding tools section is still a placeholder.
- Holdout sets (`eval/descriptions-holdout.csv`, `eval/descriptions-holdout2.csv`) are uncommitted and not frozen. Freeze the keywords or write a new blind set.
- Phone AI: after a load error, a reload is needed to retry (`web/src/lib/llm.ts`). A question the phone answers can still sync during generation. Add a `generating` status that the sync skips.
- The `engines` field allows Node 20.0 to 20.11, where the hub cannot start.
- Not verified against the repo: the Python 3.12 and transformers 5.x versions for the Laya export, the Q8_0 size, and the Windows firewall step.
- [[2026-10-09-laya-gemma-roles]], [[2026-10-09-gemma-llamacpp-speed]], [[2026-10-09-laya-option-text-fix]], [[2026-10-09-laya-webgpu-speed]] are the related notes.
- [Home.md](../../Home.md) links to a `ugatan/` folder and `appbuildersph-notskramz/docs/project-structure.md`. Neither exists.
