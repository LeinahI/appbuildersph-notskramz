# Fix Laya option truncation and configure Laya on the hub

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Make Laya work and configure it on the hub. See also [[2026-10-09-sync-local-model-paths]].

## What changed
- [hub/src/matchers/laya.ts](../../hub/src/matchers/laya.ts): replaced `problemCriteria` with `problemOptions`. Options are now plain text (`<short name>: <signs>`), passed as an array, and the chosen text is mapped back to the problem id.
- [hub/test/laya.test.ts](../../hub/test/laya.test.ts): uses `problemOptions`.
- [hub/test/laya-options.test.ts](../../hub/test/laya-options.test.ts): new, runs without a model. Checks one option per entry, unique text, no id in the text.
- `hub/.env` (gitignored, not committed): `HUB_MATCHER=laya`, `LAYA_MODEL_DIR=E:/models/laya-onnx`, `LAYA_CONFIDENCE_THRESHOLD=0.3`, `LAYA_PASS_MARK=0.5`, keyword fallback on.
- [README.md](../../README.md) and [Home.md](../../Home.md): Tagalog finding and the truncation warning.

Behavior now: the hub starts with Laya and answers `/ask` with `matcher: laya`.

## Second round (hybrid, paraphrase set, multilingual)
- [hub/src/matchers/hybrid.ts](../../hub/src/matchers/hybrid.ts): new `HUB_MATCHER=hybrid`. Keyword answers first; Laya is asked only when keyword is not sure, and only a clear Laya answer replaces it. A Laya error at question time returns the keyword answer. Config, `main.ts`, and the `matcher` type in shared and web accept `hybrid`.
- [eval/descriptions-paraphrase.csv](../../eval/descriptions-paraphrase.csv): 31 farmer-style rows that avoid the problem names and trigger words. Written by the agent, not reviewed by an agriculturist. [eval/run.ts](../../eval/run.ts) takes `--file <name>` and now scores hybrid with the same pass rule.
- Multilingual checkpoint exported to ONNX at `E:\models\laya-multilingual-onnx` (tools in `E:\models\export-tools`, outside the repo). It needs [patches/@receptron__laya@0.1.2.patch](../../patches/@receptron__laya@0.1.2.patch), a pnpm patch so Laya accepts `<bos>`/`<eos>`/`<mask>`/`<pad>` as well as `[CLS]`/`[SEP]`/`[MASK]`/`[PAD]`.
- Fixed a broken regex in `hub/test/config.test.ts` that another session's edit had left (the file would not load).

Results, threshold 0.3, English bundle: original 27 rows, keyword 96.3%, Laya 63.0%, hybrid 96.3%, none wrong. Paraphrase 31 rows, keyword 64.5%, Laya 38.7%, hybrid 67.7%, none wrong. Multilingual bundle: worse on every set (Tagalog 1 of 19 right) and overconfident, so it stays unused.

## Decisions
- Root cause: Laya's `buildSequence` cuts every option to `floor(176 / n)` tokens (22 for 8 options) when they exceed the 192-token head budget, without an error. The old text `<id>: <name>. Signs: ...` used the budget on the id and name, so the signs never reached the model. Old result on the labeled set: 40.7% correct, 59.3% wrong, wrong answers at up to 0.90 confidence.
- Tried four option formats on the 27 rows; "short name + all signs" was best overall (16/27 raw). "Signs only" did better on English (8/9) but worse on Taglish (4/9).
- Threshold 0.3: the highest-confidence wrong answer was 0.25 and every "none" row was at or below 0.07. The margin is small and the set is only 27 rows.
- Pass mark 0.5 is my provisional value. AGENTS/config call both values team decisions.

## Verification
- `pnpm build`: passed. `pnpm test` with `LAYA_MODEL_DIR` set: 120 tests passed (hub 50, including the 6 real-model Laya tests).
- `pnpm eval` with threshold 0.3: Laya 63.0% correct, 0% wrong, 37.0% not sure (en 66.7, tl 22.2, taglish 100). Keyword: 96.3% correct. Verdict: FAIL (Laya does not beat keyword).
- Started the hub on a spare port and sent 3 `/ask` requests: correct clear answers for a rice blast and a BPH description, not clear for an off-topic one. Stopped it afterward.
- Not re-run after the last edits: the full build and test pass with the final `hub/.env`, because that command was interrupted. The hybrid tests, config tests, and both evals passed earlier in the session.
- A different hub was already listening on port 8799 before I started. I left it alone.

## Follow-ups
- Laya alone does not beat keyword. Use `HUB_MATCHER=hybrid`. `hub/.env` is still `laya`; change it to `hybrid` on each machine.
- The owner is adding knowledge in the multilingual wording. Re-run `pnpm eval` with both bundles afterward; the multilingual bundle may do better once the option text is in Tagalog.
- On the hybrid verdict: it ties keyword on the original set, so "must beat keyword" reports FAIL there and PASS on the paraphrase set.
- The labeled set has 27 rows written close to the knowledge text. Grow it before trusting the threshold.
