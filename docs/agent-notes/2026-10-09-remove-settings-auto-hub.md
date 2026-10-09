# Remove settings; auto hub URL

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Drop settings gear / “Ihanda ang AI”; connect hub automatically to `http://127.0.0.1:8787`.

## What changed
- Deleted SettingsDialog; removed settings button from chat header
- [hub.ts](../../web/src/config/hub.ts): default `http://127.0.0.1:8787` (optional `VITE_HUB_URL`)
- Labels cleaned of prepare-AI / hub address UI copy

## Decisions
Phone on-device prepare is unused; answers go through the hub sync path.

## Verification
`pnpm exec tsc --noEmit` in web: passed

## Follow-ups
Restart web dev server if `VITE_HUB_URL` was set in `.env.local` to the old LAN IP.
