# Photo recognition with the local Gemma 4 vision model

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Add image recognition using the local models, then apply it to the web app at http://localhost:3000/. A farmer attaches a photo of the plant; the hub reads it and the answer uses what it saw.

## What changed
- The hub now reads photos with the local Gemma 4 E2B ONNX model (text decoder, vision encoder) on the CPU. It writes down the visible signs in plain English only. The matcher still decides and Gemma still explains in Taglish, so a photo adds signs and never picks the problem.
- Why the ONNX model: the llama.cpp GGUF has no vision projector (`mmproj`) file here, and `node-llama-cpp` 3.22.1 has no image input. `E:/models/gemma-4-E2B-it-ONNX` already holds `vision_encoder*.onnx`, so nothing was downloaded.
- Shared: [shared/src/api.ts](../../shared/src/api.ts) (`image` on the request; `photo` and `photoSigns` on the response; limits), [shared/src/prompt.ts](../../shared/src/prompt.ts) (`PHOTO_SYSTEM_PROMPT`, `buildPhotoMessages`, `photoOutcome`), [shared/src/index.ts](../../shared/src/index.ts).
- Hub: new [hub/src/explain/multimodal.ts](../../hub/src/explain/multimodal.ts) (lazy load, background preload) and [hub/src/image.ts](../../hub/src/image.ts) (JPEG header check, size limit before decoding). Changed [hub/src/answer.ts](../../hub/src/answer.ts), [hub/src/server.ts](../../hub/src/server.ts) (16 KB limit kept for requests without a photo), [hub/src/config.ts](../../hub/src/config.ts) (`HUB_VISION`, `VISION_MAX_NEW_TOKENS`), [hub/src/main.ts](../../hub/src/main.ts), [hub/src/log.ts](../../hub/src/log.ts), [hub/.env.example](../../hub/.env.example). `/health` now reports `vision`.
- Web: camera button, preview with a remove button, photo thumbnail in the message, and a note for each photo result ([web/src/App.tsx](../../web/src/App.tsx), [web/src/lib/photo.ts](../../web/src/lib/photo.ts), [web/src/lib/db.ts](../../web/src/lib/db.ts), [web/src/lib/sync.ts](../../web/src/lib/sync.ts), [web/src/config/labels.ts](../../web/src/config/labels.ts)). A question with a photo always waits for the hub, because the phone AI cannot read photos.
- The local `hub/.env` (gitignored) now has `HUB_VISION=on`. README has a new "Photos" section.

## Decisions
- Photo text goes through the matcher, not straight to an answer, to keep the rule that Gemma explains and does not diagnose. A photo that is not rice or corn, or shows nothing wrong, adds nothing to matching.
- Vision loads in the background so the hub still starts listening at once. `HUB_VISION` is off by default because it needs the ONNX folder and CPU time.
- The model's fixed answers ("No signs.", "Not rice or corn.") are also recognised at the end of a sentence, after a real run showed the model writing a sentence first.
- Tried raising the image token budget to 560 to catch small spots: the vision encoder is fixed at 280 and it fails with a token and feature mismatch, so 280 stays.

## Verification
- `pnpm --filter @ugatan/shared test`: 144 passed. Hub `tsc`: clean. Hub tests that do not load real models (photo, server, config, answer, conversation, conversation-safety, hybrid, keyword, examples, gemma-trim): 123 passed. Web `tsc`, `vitest` (33 passed), and `pnpm build`: passed.
- Real model, standalone: a drawn leaf was described correctly; 28 s warm on CPU, 8 s load.
- Real model through the hub's `/ask` with HUB_VISION on: 35 s (idle machine); 192 s once while the CPU was at 82% from other processes.
- Browser at http://localhost:3000/: attached a photo, saw the preview, sent it, saw the thumbnail, the "reading" note, then the hub's reply and the "Nakita sa litrato (English)" line. Checked the remove button in dark mode and fixed its invisible icon.
- Not run: the full hub test suite (it loads the real models and took 5 minutes under load; I ran the other files instead), a phone, real field photos, and any labeled photo set. The photo accuracy is unknown.
- Hub on port 8787 runs under `tsx watch` and restarted many times from another session's edits while I tested. I ran a separate hub on port 8788 (vision and keyword only) for the final photo check, then stopped it and cleared the tab's hub override.

## Follow-ups
- Collect labeled field photos and score them before farmers rely on it (see README, Pending decisions, "Photo accuracy").
- The model's description varies with the JPEG encoding of the same scene, and the 280-token limit can miss small spots in wide shots. Close-ups are the safer ask for farmers.
- Photos are not kept in the hub's chat memory after a restart: the phone's history has only the typed text, so a follow-up after a restart loses the photo's signs.
- Not tested: a hub with `GEMMA_RUNTIME=onnx` and vision together (memory use), and the E4B model.
