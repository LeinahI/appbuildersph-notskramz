# Admin login, local chats, hub-aware models

- Date: 2026-10-10
- Agent: Auto
- Status: done

## Task

Keep staff admin at `/admin` → `/admin/login` → `/admin`; keep farmer chats device-local (Dexie); route Gemma backends by hub reachability (LiteRT away, ONNX on hub, Q4_0 hub text + ONNX vision/voice).

## What changed

- [web/src/pages/admin/LoginPage.tsx](../../web/src/pages/admin/LoginPage.tsx) — staff “farmer portal” link goes to `/chat`
- [web/src/lib/ai-route.ts](../../web/src/lib/ai-route.ts) + [web/test/ai-route.test.ts](../../web/test/ai-route.test.ts) — `resolveAiRoute` / `preferHubAsk`
- [web/src/App.tsx](../../web/src/App.tsx) — ask path uses hub reachability + route for phone vs hub sync
- [web/src/lib/conversations.ts](../../web/src/lib/conversations.ts) — documents Dexie-only farmer chats (no ws sync)
- [hub/.env.example](../../hub/.env.example) — model matrix + `PHONE_LITERT_FILE`
- [README.md](../../README.md) — admin seed path + Gemma matrix table

## Decisions

- No route redesign for admin; `RequireAdmin` already redirects.
- Farmer claim/login routes already redirect to chat; kept admin QR claim APIs for staff registration.
- Hub multimodal stays ONNX because GGUF Q4_0 has no vision/audio projector.

## Verification

- `pnpm --filter @ugatan/web test`: 283 passed (26 files), including `ai-route.test.ts`
- Manual admin login against live `ws` not run in this session

## Follow-ups

- Browser QA: unauthenticated `/admin` → seed login → Users; hub up/down ask path on Android LiteRT
