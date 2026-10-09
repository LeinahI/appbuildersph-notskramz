# Hub serves the on-phone LiteRT-LM Gemma model

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Connect the `gemma-4-E2B-it.litertlm` model to the project, check the hub serves it, and set `PHONE_LITERT_FILE` in the hub env files instead of only in `.claude/launch.json`.

## What changed
- [hub/.env.example](../../hub/.env.example): documented `PHONE_LITERT_FILE` (commented, like the other optional settings).
- `hub/.env` (gitignored): set `PHONE_LITERT_FILE=E:/models/gemma-4-E2B-it-litert-lm/gemma-4-E2B-it.litertlm`.
- No code changes. The app side already existed: [LocalLlmPlugin.java](../../web/android/app/src/main/java/ph/appbuilders/ugatan/LocalLlmPlugin.java), [web/src/lib/llm.ts](../../web/src/lib/llm.ts), [hub/src/server.ts](../../hub/src/server.ts). The filename matches `MODEL_FILE` and `PHONE_LITERT_PATH`.
- Before this, only the `hub-phone` and `hub-8787` configs in [.claude/launch.json](../../.claude/launch.json) set the path, so a hub started any other way reported `phoneLitert: off`.

## Decisions
Put the path in `hub/.env` so every way of starting the hub serves the model. Left `launch.json` as it was.

## Verification
- Started `hub-phone` (port 8790). `/health` returned `phoneLitert: "on"`.
- `HEAD /models/litert/gemma-4-E2B-it.litertlm` returned 200, content-length 2588147712, equal to the file size on disk.
- A range request for byte 0 returned 206 with `content-range: bytes 0-0/2588147712`.
- The first 16 bytes served matched the file (`LITERTLM` header).
- Not run: the `.env` edit was not tested by a restart; Android build (`cap sync`, APK), the phone download, model load, and answers on a real phone; `pnpm test`.

## Follow-ups
- Build and install the APK, then test the download and answers on a real phone on the same Wi-Fi.
- Restart the hub without the launch.json env to confirm `hub/.env` alone gives `phoneLitert: "on"`.
