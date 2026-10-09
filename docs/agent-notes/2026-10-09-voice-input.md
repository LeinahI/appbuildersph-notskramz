# Voice input with the local Gemma 4 audio model

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Add a mic function. The app already had a mic button that used the browser's cloud speech service (needs internet), so this adds speech writing with the local models, next to the photo feature from [[2026-10-09-photo-recognition]].

## What changed
- The farmer taps the mic, speaks (up to 30 s), taps again. The phone converts the recording to 16 kHz mono PCM and sends it to the new `POST /transcribe`. The hub writes it down with the local Gemma 4 E2B ONNX audio encoder and decoder (same folder and same loaded model as photos). The words fill the text box; the farmer checks them and sends as usual.
- Fallback: with no hub, or `HUB_VOICE` off, the button uses the browser's speech service as before.
- Shared: [shared/src/api.ts](../../shared/src/api.ts) (request, response, audio limits), [shared/src/prompt.ts](../../shared/src/prompt.ts) (`TRANSCRIBE_PROMPT`, `transcriptText`), [shared/src/index.ts](../../shared/src/index.ts).
- Hub: new [hub/src/audio.ts](../../hub/src/audio.ts), [hub/src/transcribe.ts](../../hub/src/transcribe.ts); renamed `vision.ts` to [hub/src/explain/multimodal.ts](../../hub/src/explain/multimodal.ts) (one model, photo and speech jobs, one at a time); changed [hub/src/server.ts](../../hub/src/server.ts), [hub/src/config.ts](../../hub/src/config.ts) (`HUB_VOICE`, `VOICE_MAX_NEW_TOKENS`), [hub/src/main.ts](../../hub/src/main.ts), [hub/src/log.ts](../../hub/src/log.ts), [hub/src/explain/index.ts](../../hub/src/explain/index.ts), [hub/.env.example](../../hub/.env.example). `/health` now reports `voice`.
- Web: [web/src/lib/recorder.ts](../../web/src/lib/recorder.ts), [web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx), [web/src/lib/sync.ts](../../web/src/lib/sync.ts), [web/src/config/labels.ts](../../web/src/config/labels.ts), [web/src/App.tsx](../../web/src/App.tsx).
- Local `hub/.env` (gitignored) now has `HUB_VOICE=on`. README has a new "Voice" section.

## Decisions
- Transcribed text goes to the text box, not straight to an answer, so the farmer can fix a mishearing before it reaches matching.
- One model instance for photos and speech, because loading the ONNX model twice would double the memory and the load time.
- The hub log keeps only the length of the audio and text, not the words.
- Kept the browser speech service as a fallback, since it is the only option without a hub.

## Verification
- Spike first: a 6.4 s synthetic English clip (Windows speech) came back almost word for word from the local audio model, 26 s on the CPU.
- Tests: shared prompt tests 24 passed. Hub `voice`, `photo`, `server`, `config` tests 64 passed (audio decoding, byte order, length limits, the handler, the HTTP route, body limits). Web `recorder` and `voice-input` tests included in 39 web tests passed. Hub `tsc`, web `tsc`, and web build: clean.
- Browser at http://localhost:3000/ against the running hub on 8787: the pane has no microphone, so I replaced `getUserMedia` with a stream playing the test clip. The real recorder, resampler, and `/transcribe` ran. The text box filled with the spoken sentence 37 s after stopping (the recording held about 20 s of trailing silence). Sending it matched Rice blast with a Taglish answer and the disclaimer.
- Not run: any real microphone, any phone, any Tagalog, Taglish, or Cebuano speech (no such voice on this machine), noisy audio, and the full hub suite with real models.
- Two tests fail in the working tree, in code another session is changing right now, and they involve questions with no photo or recording: `shared/test/conversation.test.ts` ("sends a poisoned or hurt farmer to the health center now") and `hub/test/conversation-safety.test.ts` ("sends a later off-topic question to the chat"). I did not touch them.

## Follow-ups
- Record real farmers in Tagalog, Taglish, and Cebuano on real phones and compare with hand-written text (README, Pending decisions, "Voice accuracy"). This is the main gap.
- Phones reaching the app over plain `http://<laptop-ip>` cannot use the microphone. It needs `localhost` or https (see "Hub network" in the README).
- Tapping mic again while the hub is still writing the last recording is disabled; there is no way to cancel a recording that is already sent.
