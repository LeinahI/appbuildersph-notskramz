# Connect the web app to the hub

- Date: 2026-10-09
- Agent: Claude Opus 5.5
- Status: done

## Task
Connect the web app at http://localhost:5174/ to the hub.

## What changed
- Found that 5173 and 5174 are Vite servers from another folder, `E:\Workspace\brylimlangmalakas\ugatan\web`. It is an older clone of this repo (same remote) without today's keywords or prompt changes. Its `web/.env.local` points at `http://localhost:8080`, where nothing listens. Did not edit or stop it.
- Started this repo's hub (`hybrid` + Gemma) on port 8787 through a new [.claude/launch.json](../../.claude/launch.json) (configs `hub` and `web`).
- In the built-in browser, set the hub address on the 5174 app to `http://localhost:8787`. It showed "Konektado sa hub" and got a hub answer for a Cebuano question.
- [web/.env.local](../../web/.env.local) (gitignored): `VITE_HUB_URL=http://localhost:8787`. This repo's web app now runs on 5175 and connects by itself.
- [web/src/App.tsx](../../web/src/App.tsx), [web/src/lib/sync.ts](../../web/src/lib/sync.ts), [web/src/lib/db.ts](../../web/src/lib/db.ts): the app stores the hub's `matchIds` and `clear` (`hubMatchIds`, `hubClear`). Once the hub answers a typed question, it shows the hub's matched notes. A tapped symptom picture keeps the farmer's pick.

## Decisions
- Before this fix, the notes and the AI text could disagree. The phone showed its own keyword match while the hub's explanation was about the hub's match. On 5174 a Cebuano stem-borer question showed "Walang malinaw na tugma" above a hub explanation naming stem borer. The hub reads more languages and wordings (Gemma's English plus Laya), so its match wins once it answers.
- Used the hub's default port 8787 rather than the 8080 in the old clone's `.env.local`, and did not change the old clone.

## Verification
- `GET /health` on 8787: `{"ok":true,"matcher":"hybrid","explainer":"gemma"}`.
- 5174 (old clone): connected and answered through the hub.
- 5175 (this repo): a Cebuano planthopper question first showed no offline match. After the hub answered, it showed "Hindi tiyak" with the BPH notes, and Gemma's explanation was about the same problem.
- `tsc --noEmit` on web: passed. `pnpm --filter @ugatan/web test`: 29 passed. No new test covers the hub-match display.
- The hub address set on 5174 is in the built-in browser's storage only. The user's own browser still needs the address typed in (or that clone's `.env.local` changed).

## Follow-ups
- Stop the old `ugatan` dev servers (5173, 5174) and the old hub on 127.0.0.1:8799 (PID 47828) when they are no longer needed. All three run old code.
- Phones on Wi-Fi need the laptop's LAN address (for example `http://192.168.x.x:8787`), not localhost, and the firewall must allow port 8787.
- Related: [[2026-10-09-multilingual-matching]], [[2026-10-09-laya-gemma-roles]].
