# Run the frontend and backend

- Date: 2026-10-09
- Agent: Claude Haiku 5.5
- Status: done

## Task
Start the web frontend and the hub backend and confirm both are running.

## What changed
No code changes. Build output was regenerated in `shared/dist`, `hub/dist`, and `web/dist` by `pnpm build`.
- Hub on port 8787 started through the `hub` preview config (`pnpm --filter @ugatan/hub start`).
- Web on port 3000 was already running from another terminal (PID 56476, `web/node_modules/vite`). I used that process instead of starting a second one.

## Decisions
- Ran `pnpm build` first because the hub runs from `dist/` and the README says `shared` must be built before `hub` and `web`.
- Did not kill the existing port 3000 process, since it is this project's dev server.

## Verification
- `pnpm build`: passed (shared, hub, web).
- `GET http://localhost:3000`: 200. The page title is "Ugatan: Offline na Payo para sa Palay at Mais", and the chat UI rendered in the built-in browser.
- `GET http://localhost:8787/health`: 200, `{"ok":true,"matcher":"hybrid","explainer":"gemma"}`.
- `POST /ask` with `uid`, `crop: "rice"`, and `text` about stem borer: 200, matched `stem-borer`, Gemma explanation returned in Taglish.
- Not run: `pnpm test`.

## Follow-ups
- The `/ask` request body needs `uid`, `crop`, and `text`. The README does not list these fields. Worth documenting.
- Port 3000 was occupied by an outside process. Whoever started it should know it is still running.
