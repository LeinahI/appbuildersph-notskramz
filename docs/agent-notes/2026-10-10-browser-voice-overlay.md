# Browser SpeechRecognition + Google-style voice overlay

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Make the chat mic use browser Web Speech API as the primary path on browser/PWA, with a Google-style listening overlay and mic permission prompt; keep hub transcription for Capacitor when hub voice is on.

## What changed
- Added [web/src/lib/browser-speech.ts](../../web/src/lib/browser-speech.ts) — `canUseBrowserSpeech`, lang map, `ensureMicPermission`, `startBrowserSpeech`
- Added [web/src/components/VoiceOverlay.tsx](../../web/src/components/VoiceOverlay.tsx) and `.voice-overlay*` styles in [web/src/index.css](../../web/src/index.css)
- Rewired [web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx): browser STT first; native/hub fallback; overlay while listening/working
- Labels + HelpDialog mic copy; README Voice / Known issues; DISCLOSURE network note
- Tests: [web/test/browser-speech.test.ts](../../web/test/browser-speech.test.ts), updated [web/test/voice-input.test.tsx](../../web/test/voice-input.test.tsx) and help-dialog assertion

## Decisions
Browser/PWA prioritizes SpeechRecognition (option 3) so localhost `/chat` works without hub voice. Capacitor keeps offline hub STT when `voice: on`. Mic permission via `getUserMedia` before `recognition.start()` to match the browser Allow/Block prompt.

## Verification
`pnpm --filter @ugatan/web test`: 294 passed (includes voice-input, browser-speech, help-dialog, voice-notice). Manual browser QA of overlay + permission not run in this pass.

## Follow-ups
Hub still reporting `voice: off` despite `HUB_VOICE=on` in hub/.env is out of scope here; only matters for Capacitor/hub path.
