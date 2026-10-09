# Fix browser STT silence after getUserMedia priming

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Mic overlay still did not convert speech to text after the interim-text fix.

## What changed
- Removed `ensureMicPermission` / getUserMedia priming before SpeechRecognition (Chrome often listened with no audio after tracks were stopped)
- SpeechRecognition requests the mic itself
- Language try-list starts with `en-US`, then `fil-PH` / `fil` / `tl`
- Session token so dismiss during start cannot leave a zombie recognizer
- Overlay prompt click no longer dismisses the session

## Decisions
Priming getUserMedia matched the Allow/Block UX but broke capture. Prefer working STT; SpeechRecognition still prompts for the mic.

## Verification
`vitest run test/browser-speech.test.ts test/voice-input.test.tsx`: 16 passed. Manual retest on the user's Chrome left to them (hard refresh).

## Follow-ups
If still silent: confirm Chrome site settings allow mic for `localhost:3000`, and that the page is online (Web Speech uses Google's service).
