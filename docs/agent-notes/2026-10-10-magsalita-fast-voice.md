# Magsalita: fast, accurate voice that stops by itself

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (UI check by a Haiku 5.5 subagent)
- Status: done

## Task
Make the "Magsalita" mic fast and accurate, using a real microphone that stops when the farmer is done speaking, and redesign the listening UI.

## What changed
- New [SpeechPlugin.java](../../web/android/app/src/main/java/ph/appbuilders/ugatan/SpeechPlugin.java) (Android `SpeechRecognizer`), registered in [MainActivity.java](../../web/android/app/src/main/java/ph/appbuilders/ugatan/MainActivity.java). The manifest now has a `RecognitionService` query. The plugin streams partial words, reports the mic level, and ends on its own when speech stops.
- New [native-speech.ts](../../web/src/lib/native-speech.ts): JS wrapper with the same callbacks as browser speech.
- [browser-speech.ts](../../web/src/lib/browser-speech.ts):
  - Uses `fil-PH` first; `en-US` only on `language-not-supported`. There is no more retry on no-speech, which made farmers repeat themselves.
  - Ends 1.2 s after the last new word (0.7 s after a final sentence), after 8 s of no speech, or at 30 s.
  - Rebuilds text from all results and drops Android Chrome repeats.
  - Gets a real level meter on desktop from a second capture, started after the recognizer has the mic.
  - Treats `network` as `offline`.
- [recorder.ts](../../web/src/lib/recorder.ts) (hub path): level callback, 1.2 s end pause (was 1.6 s), and an 8 s no-speech stop (was 30 s).
- [VoiceInput.tsx](../../web/src/components/VoiceInput.tsx):
  - Order of paths: phone recognizer, then browser speech, then hub recorder.
  - On an `offline` error it falls back to the hub when hub voice is on; otherwise it shows the new `voiceOffline` notice.
- [VoiceOverlay.tsx](../../web/src/components/VoiceOverlay.tsx) and `.voice-*` styles in [index.css](../../web/src/index.css):
  - Replaces the dark full-screen scrim with a green bottom sheet (centered card on desktop).
  - Shows a status pill (Nakikinig… / Naririnig kita…), live words, and a mic orb whose halo and waveform bars follow the real level.
  - Shows the hint "Kusang hihinto…" and Kanselahin / Tapos na buttons.
- [labels.ts](../../web/src/config/labels.ts): new strings in tl/en/ceb: `voiceListening`, `voiceHearing`, `voiceAutoStop`, `voiceDone`, `voiceCancel`, `voiceOffline`.
- [App.tsx](../../web/src/App.tsx) and [ToastHost.tsx](../../web/src/components/ToastHost.tsx): a new voice attempt closes the previous voice error toast.
- README "Voice" section updated.

## Decisions
- The Android app sent every recording to the hub's Gemma model, which takes about 26 s. The phone's recognizer is near-instant and has proper end-of-speech detection. The hub stays as the offline fallback.
- `en-US` first wrote Tagalog as English gibberish. The earlier note blamed `fil-PH` for returning nothing, but that was during the getUserMedia priming bug, which is now fixed.
- The meter runs off React state (rAF writes CSS variables), so the sheet does not re-render 60 times a second.

## Verification
- `pnpm exec tsc --noEmit` (web): passed.
- `pnpm exec vitest run` (web): 35 files, 364 tests passed. This includes new tests for auto-stop, no-speech, offline, Android repeats, abort, the native path, and the hub fallback.
- `gradlew :app:compileDebugJavaWithJavac`: passed. `pnpm --filter @ugatan/web android:apk`: BUILD SUCCESSFUL (`app-debug.apk`).
- Browser pane check (Haiku agent, fake SpeechRecognition): the sheet opened with `fil-PH`, showed live words and moving bars, closed by itself after the words stopped, and fit at 375 px with no horizontal scroll. There were no console errors.
- Not run: real speech in Chrome, and the native recognizer on a phone or emulator (no device was attached).

## Follow-ups
- Test on a real Android phone: the plugin works on phones with Google's speech service. Offline use needs the phone's Filipino offline speech pack, otherwise it falls back to the hub.
- Confirm in desktop Chrome that the second mic capture for the meter does not disturb recognition. If it does, drop `startLevelMeter` in [browser-speech.ts](../../web/src/lib/browser-speech.ts).
- Related: [[2026-10-10-browser-voice-overlay]], [[2026-10-10-browser-stt-mic-prime-fix]].
