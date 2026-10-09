# Fix mic stop flashing hub “writing” then empty

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
After speaking, tapping the big red mic showed “Isinusulat ng hub…” for a moment, then “Walang narinig na salita…”.

## What changed
- [web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx): start browser STT immediately (no hub probe await); path/mode refs for stop; only show hub working after PCM exists
- [web/src/lib/browser-speech.ts](../../web/src/lib/browser-speech.ts): on user stop, commit text / silent end — never toast empty from Chrome’s `no-speech` after stop
- [web/src/lib/recorder.ts](../../web/src/lib/recorder.ts): `MediaRecorder.start(250)` + `requestData()` so stop is not an empty blob
- VoiceOverlay accepts `workingLabel`

## Decisions
The hub copy proved the hub recorder path ran (hub `voice: on`). Browser STT must not wait on `/health`. Empty after stop was often Chrome `no-speech` on `recognition.stop()` or an empty MediaRecorder blob.

## Verification
`vitest run test/browser-speech.test.ts test/voice-input.test.tsx test/recorder.test.ts`: 22 passed.

## Follow-ups
Hub log still shows multimodal load failure (`preprocessor_config.json` missing under GEMMA_MODEL_DIR). Hub STT will fail until that ONNX folder is complete; browser STT should not need it.
