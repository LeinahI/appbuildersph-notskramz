# Fix browser STT dropping interim-only results

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Mic overlay opened but speech never became text, while Google STT on the same machine worked.

## What changed
- [web/src/lib/browser-speech.ts](../../web/src/lib/browser-speech.ts): keep interim + final; commit best text on `onend`; `continuous: true`; short delay after releasing `getUserMedia`; English lang `en-US`
- [web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx) / [VoiceOverlay.tsx](../../web/src/components/VoiceOverlay.tsx): show live interim text on the overlay
- Tests updated for interim commit and `en-US`

## Decisions
Chrome often ends a session with interim-only results; treating that as empty was the main bug. Live overlay text makes failures visible.

## Verification
`pnpm --filter @ugatan/web exec vitest run test/browser-speech.test.ts test/voice-input.test.tsx`: 15 passed. Manual browser retest left to the user.

## Follow-ups
If Tagalog still fails while English works, try speaking after the mic icon appears in the address bar, then tap the big mic to stop and commit.
