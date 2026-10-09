# Make the app local only and usable offline without a server

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code)
- Status: partial

## Task
Carry out the recommendations from [[2026-10-10-standalone-offline-assessment]] (translated cards, chat without a `ws` claim, phone AI gated by memory), then make the project reach no internet at runtime.

## What changed
- Tagalog and Cebuano card text: optional `translations` field ([shared/src/types.ts](../../shared/src/types.ts)), validated item for item and run through the pesticide guardrail ([shared/src/knowledge.ts](../../shared/src/knowledge.ts)), `localizeEntry` helper. All 20 files in `knowledge/` have `tl` and `ceb` text, drafted by the agent and **not reviewed**.
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx) shows the card in the interface language, with "Orihinal sa English" under each translated card.
- Local profile ([web/src/config/profile.ts](../../web/src/config/profile.ts)): "Gamitin nang walang account" on `/login` opens the chat with no server. `RequireFarmer` accepts a claim link or a local profile. QR claim stays optional and only adds sync. No key pair: nothing would check it.
- Phone AI: offered only when `navigator.deviceMemory` is at least 8 GB (warning when unknown). Weights come from the hub (`GET /models/onnx-community/gemma-4-E2B-it-ONNX/...`, [hub/src/models.ts](../../hub/src/models.ts), `phoneModel` in `/health`), never Hugging Face. The ONNX runtime comes from the app's `/ort/` ([web/vite.config.ts](../../web/vite.config.ts)), not jsDelivr.
- Voice: the browser speech fallback (sends audio to Google) is removed. Voice is hub-only; the mic says to join the hub Wi-Fi otherwise ([web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx)).
- Laya: `laya`/`hybrid` refuse to start without `LAYA_MODEL_DIR`; `eval/run.ts` lost `--allow-download`.
- README updated.

## Decisions
- The hub and `ws` on the local network count as local; only internet calls were removed. Photos and voice stay on the hub (no phone model for them).
- The model is served by the hub because the hub already holds the same ONNX folder (`GEMMA_MODEL_DIR`), and Transformers.js caches what it fetches.

## Verification
- `pnpm build`: passed. `dist/ort/` holds the runtime; precache stays 1.38 MB.
- `pnpm test`: shared 259 passed, web 186 passed, hub 202 passed and 2 failed. Both failures are the real-model Gemma tests: the llama.cpp one took 35 s against a 10 s limit while another session's dev server and hub ran on the machine. Not caused by these changes, but not re-run on an idle machine.
- Browser (the other session's dev server on :3000): offline start opened `/chat` with no account; a stem-borer question showed the Tagalog card and the English toggle.
- Not checked: loading the phone model from the hub end to end, `/ort/` in `pnpm dev` (that server was not restarted), any real phone.

## Follow-ups
- An agriculturist must review the Tagalog and Cebuano card text, especially the Cebuano.
- Test "Ihanda ang AI" against a hub with `GEMMA_MODEL_DIR` on an 8 GB phone, and whether the browser keeps the 3.1 GB cache.
- `eval/fetch-fleurs.py` still downloads test clips; it is dev tooling, not the app.
