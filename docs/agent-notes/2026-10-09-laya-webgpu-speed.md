# Make Laya matching faster

- Date: 2026-10-09
- Agent: Claude Opus 5.5
- Status: done

## Task
Make the hub's Laya matcher faster, after the Gemma speed-up in [[2026-10-09-gemma-llamacpp-speed]].

## What changed
- [hub/src/matchers/laya.ts](../../hub/src/matchers/laya.ts): `createLayaMatcher` takes a `device` option (`webgpu` or `cpu`, default `cpu`). On `webgpu` it loads the session on onnxruntime's WebGPU backend, then asks one warm-up question. If either step fails it warns and loads on the CPU. The CPU route also gets the warm-up, so the first farmer's question is not the slow one. onnxruntime's "nodes not assigned" notice is hidden (`logSeverityLevel: 3`). The ask-and-rank code moved into a small `ask` helper used by both the warm-up and `match`.
- [hub/src/config.ts](../../hub/src/config.ts): new `LAYA_DEVICE` (`webgpu` default, or `cpu`). [hub/src/main.ts](../../hub/src/main.ts) and [eval/run.ts](../../eval/run.ts) pass it through.
- Tests: [hub/test/laya.test.ts](../../hub/test/laya.test.ts) adds "ranks the same problems on the GPU as on the CPU". The existing threshold tests stay on the CPU, because WebGPU confidences can differ in the fourth decimal. [hub/test/config.test.ts](../../hub/test/config.test.ts) covers `LAYA_DEVICE`.
- [README.md](../../README.md) ("Laya bundle") and [hub/.env.example](../../hub/.env.example) document it.

## Decisions
Benchmarked 6 farmer questions on the dev laptop (i7-13700HX, RTX 4060), English Laya bundle:
- CPU, default threads: 0.8 to 1.3 s per question. Limiting threads (6, 8, 12) was noisy (0.4 to 3.5 s) and 24 threads was slower (1.7 to 2.3 s), so thread tuning was not adopted.
- DirectML: loads, then fails on the first answer (Reshape node, "The parameter is incorrect"). Not used.
- WebGPU: 85 to 120 ms per question once warm (the first answer is about 0.8 s, hence the warm-up). Same top answer and confidence on all 6 questions (one confidence 0.0144 on CPU, 0.0143 on WebGPU).
- Chose WebGPU with automatic CPU fallback, so a teammate's machine without a working GPU still runs.

## Verification
- `pnpm eval` with `LAYA_DEVICE=cpu` and `LAYA_DEVICE=webgpu`: identical reports (keyword 96.3%, Laya 63.0%, hybrid 96.3%, 0 wrong). Wall time 49 s on the CPU, 21 s on WebGPU, including model load.
- Built hub on port 8811, 5 `/ask` calls: matching took 130 to 330 ms when Laya ran (was 0.9 to 3.7 s), whole answer with Gemma 1.0 to 1.4 s. Same matched problems as before.
- `pnpm test` from the repo root: shared 43, web 29, hub 69 passed (with the real Laya and Gemma bundles from `hub/.env`).
- Not run: a machine without WebGPU (the CPU fallback path was not triggered on real hardware), the multilingual Laya bundle on WebGPU.

## Follow-ups
- Another session was editing the same working tree at the same time (prompt verdicts, `notesToExplain`, `hub/src/answer.ts`, Gemma tests, `web/src/App.tsx`). Its files were left out of this task.
- Laya's confidences on Tagalog and Taglish questions are mostly far below the 0.3 threshold (0.01 to 0.1 in the benchmark), so in `hybrid` it often runs without changing the answer. Now it costs about 0.1 s, so this matters less.
