# Voice: measured on real Tagalog and Cebuano speech, and faster

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Make the mic work better and support the project's languages (Tagalog, Taglish, Cebuano, English). The user cannot speak these languages and asked me to find voice recordings on the web to test with.

## What changed
- Found and measured real speech. Google FLEURS (CC-BY-4.0) has read Filipino and Cebuano with the correct text. Its API could not serve single clips, so I fetched only the first 25 MB of each language's `dev.tar.gz` and its `dev.tsv` (28 Filipino and 32 Cebuano clips, kept outside the repo) and extracted only `.wav` files by name. The 32-bit float WAV format cost me a wrong first result (93% error from my own bad decoding), caught and fixed.
- New phone-side speech helpers: [web/src/lib/speech.ts](../../web/src/lib/speech.ts) cuts the silence from the start and end, raises a quiet voice (at most 8 times), and returns nothing when there is only room noise, so the app says "no speech" without waiting for the hub. The recorder in [web/src/lib/recorder.ts](../../web/src/lib/recorder.ts) now stops by itself 1.6 s after the farmer stops talking. [web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx) uses both, with the per-language labels another session added.
- Hub setting for more exact weights: `MULTIMODAL_DTYPE` and `AUDIO_DTYPE` in [hub/src/config.ts](../../hub/src/config.ts), [hub/src/explain/multimodal.ts](../../hub/src/explain/multimodal.ts), [hub/src/main.ts](../../hub/src/main.ts), [hub/.env.example](../../hub/.env.example). The default stays `q4f16`.
- Reusable scoring: [eval/voice.ts](../../eval/voice.ts) (`pnpm eval:voice`), [eval/lib/wer.ts](../../eval/lib/wer.ts), [eval/fetch-fleurs.py](../../eval/fetch-fleurs.py), `eval/voice-clips/` in `.gitignore`. It runs the shipping transcription code, not a copy.
- Tests: [web/test/speech.test.ts](../../web/test/speech.test.ts), [hub/test/wer.test.ts](../../hub/test/wer.test.ts), a config test. README "Voice" has the measurements.

## Decisions
- No language hint in the request. I added a `language` field and then removed it: the model card's prompt naming Tagalog or Cebuano gave the same text as the language-free prompt (within one word on both clips), and a wrong hint could make the model write the wrong language.
- Default weights stay 4-bit. 8-bit weights were more exact but 6.3 GB; loading them failed with `bad allocation` when 0.9 GB was free, and this laptop sits at 99% committed memory with several sessions running. It is a setting for a hub machine with spare memory.
- Silence trimming happens on the phone, because it saves the hub 10 or more seconds on a long recording and works offline.

## Verification
- Real clips, same prompt, two clips per language: 4-bit weights Tagalog 40.0% word and 7.9% character error, Cebuano 29.5% and 10.9%. 8-bit weights Tagalog 13.3% and 3.2%, Cebuano 25.0% and 8.5%. Audio encoder alone at 8-bit: 64% word error on the first Tagalog clip (4-bit 79%, full 8-bit 29%). Clip counts are small, so these are indications.
- `pnpm eval:voice` ran on one clip per language through the shipping code and reproduced the 4-bit numbers (78.6% and 38.5% word error on those clips).
- Browser at http://localhost:3000/ against the running hub on 8787, with a fake microphone playing the English test sentence after 3 s of silence: one tap, the recording stopped by itself at 10.3 s, the phone sent 6.0 s of audio instead of 10 s, and the correct text arrived 18 s after the stop (the old test took 37 s).
- Tests: web 135 passed, hub tests that do not load real models 170 passed, hub `tsc` and web `tsc` and build clean. `shared` tests: 218 passed, but `shared/test/prompt.test.ts` does not load because of a syntax error in the "an answer to a photo" block, which another session is writing; I did not touch it.
- Not run: the full hub suite with real models, a real microphone, any phone, any farm words, any Taglish, and the 8-bit runs on a quiet machine (two mixed-precision runs and one 8-bit run died with allocation errors, so those results are partial).

## Follow-ups
- The main gap: real farmers' recordings with the correct text, in Tagalog, Taglish, and Cebuano, on real phones. FLEURS is read Wikipedia text, so farm words are untested.
- Repeat the 8-bit comparison on a machine with free memory and more clips, then decide the hub default.
- A larger model (E4B, not on this machine) is the other likely accuracy gain; it needs a download of several GB, so I did not fetch it.
- Phones over plain http cannot use the mic (README, "Hub network").
