# Landing benchmarks: GPU machine note

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Show the hub GPU from `node-llama-cpp inspect gpu` on the landing benchmarks instead of only the CPU model.

## What changed
- [hub/scripts/landing-benchmarks.ts](../../hub/scripts/landing-benchmarks.ts) — `machineNote` from `npx node-llama-cpp inspect gpu` (prefers Vulkan/CUDA device)
- [web/public/benchmarks.json](../../web/public/benchmarks.json) — `machineNote`: `Vulkan · NVIDIA GeForce RTX 3060 Laptop GPU` (timings unchanged from prior run)
- [web/src/landing/LandingBenchmarks.tsx](../../web/src/landing/LandingBenchmarks.tsx) — tooltip that the note comes from inspect gpu
- [README.md](../../README.md) — documents the label source

## Decisions
Reuse the same CLI the team already runs for GPU checks; prefer discrete GPU names over Intel UHD when both appear in Vulkan devices.

## Verification
- `npx node-llama-cpp inspect gpu` in `hub/`: Vulkan available, devices include RTX 3060 Laptop GPU
- Landing lead should read that Vulkan/GPU string after refresh

## Follow-ups
Re-run `pnpm --filter @ugatan/hub benchmark:landing` when timings need refreshing; machine note will be rewritten from inspect gpu.
