# Chat mic not working: diagnosis

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
"Fix the mic in the chat. It is not working." Find out why before changing code.

## What changed
No code changes. Findings only.

- Desktop browser (localhost:3000) against the hub on 8787 with a fake mic stream: the recorder started, stopped, converted the audio and `POST /transcribe` returned 200. The mic code path works when the hub is reachable and `voice` is `on` in `/health`.
- Phone `a5cd977` (installed APK, updated 2026-10-10 03:54): the app is not on the hub's Wi-Fi. Tapping the mic shows "Ang hub ang nagsusulat ng boses. Kumonekta sa Wi-Fi ng hub..." (`voiceUnavailable`) and nothing records. `RECORD_AUDIO` is `granted=false` because no recording was ever started, so the permission prompt has never appeared.
- By design in [web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx): with no reachable hub that has voice on, the mic never records. The phone's own Gemma (LiteRT) is loaded with no audio backend in [LocalLlmPlugin.java](../../web/android/app/src/main/java/ph/appbuilders/ugatan/LocalLlmPlugin.java), so there is no on-device speech writing.
- Hub on 8790 (hub-phone profile) reports `voice: off`; the hub on 8787 reports `voice: on`.

## Decisions
Did not edit code: the failing case depends on whether voice is expected to work without the hub, which is the user's call.

## Verification
Browser pane run with a stubbed `getUserMedia`; `pnpm exec vitest run` for voice-input, recorder, home-page (31 passed); adb screenshots and `dumpsys` on the phone. Not run: a real microphone, the phone while connected to the hub's Wi-Fi.

## Follow-ups
- Decide: keep hub-only voice (then test the phone on the hotspot, and make the offline message clearer), or add on-device speech writing.
- Phones using the hub-served app over plain `http://<ip>` get no microphone (browser rule).
