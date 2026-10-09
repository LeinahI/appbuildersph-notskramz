# Ugatan landing page + real AI benchmarks

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Implement the browser-only marketing landing at `/` with GSAP/Motion, stack transparency, and hub-measured timings in `web/public/benchmarks.json`.

## What changed
- Deps: `gsap`, `@gsap/react`, `motion` on `@ugatan/web`
- Routes: [web/src/main.tsx](../../web/src/main.tsx) — browser `/` lazy-loads LandingPage; native still `Navigate` to `startPath()` (`/setup` or `/chat`)
- Landing UI: [web/src/pages/LandingPage.tsx](../../web/src/pages/LandingPage.tsx), [web/src/landing/](../../web/src/landing/), [web/src/landing.css](../../web/src/landing.css)
- Hub script: [hub/scripts/landing-benchmarks.ts](../../hub/scripts/landing-benchmarks.ts) via `pnpm --filter @ugatan/hub benchmark:landing`; writes [web/public/benchmarks.json](../../web/public/benchmarks.json) only with finite positive ms
- Docs: [README.md](../../README.md) landing + benchmark command; smoke test [web/test/landing.test.tsx](../../web/test/landing.test.tsx)

## Decisions
- No React canary / View Transitions; Motion + GSAP ScrollTrigger only
- Real timings only — script exits 1 if GGUF/ONNX path missing; photo omitted when JPEG ingest failed (voice still measured)
- `process.exit(0)` after write so llama.cpp/onnxruntime native handles do not hang the script

## Verification
- `pnpm --filter @ugatan/web test`: 297 passed (includes landing smoke)
- `pnpm --filter @ugatan/hub benchmark:landing`: wrote keyword 0.6 ms, explain_gguf 4880 ms, voice_transcribe 29549 ms (photo skipped: corrupt minimal JPEG; fixed for next run)

## Follow-ups
- Re-run `benchmark:landing` to pick up photo_describe with the fixed 1×1 JPEG
- Optional: map `/login` → `/chat` if product prefers that over landing
