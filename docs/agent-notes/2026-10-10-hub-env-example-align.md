# Align hub/.env.example with working local .env

- Date: 2026-10-10
- Agent: Auto
- Status: done

## Task

Reshape [hub/.env.example](../../hub/.env.example) to match the machine’s working `hub/.env` layout (hybrid Laya, GGUF explain, ONNX vision/voice, LiteRT file).

## What changed

- [hub/.env.example](../../hub/.env.example) — same sections/comments as the local `.env`; example paths; model-matrix notes; `HUB_VISION=on` (valid values only)
- Local `hub/.env` (gitignored): fixed typo `HUB_VISION=on6` → `on` (config rejects anything but `on`/`off`)

## Decisions

- Kept example paths from the working machine so copy-paste is obvious; operators still edit paths for their disks.
- Did not put secrets in the note or commit `.env`.

## Verification

- Config rule checked in [hub/src/config.ts](../../hub/src/config.ts): `HUB_VISION` must be `on` or `off`
- Hub tests not re-run (docs/env only)

## Follow-ups

None
