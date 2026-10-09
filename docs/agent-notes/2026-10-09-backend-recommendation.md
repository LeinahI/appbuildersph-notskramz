# Best backend for Ugatan (research only)

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: done

## Task
The user asked what the best backend is for this project.

## What changed
No code changes. Read [README.md](../../README.md), [AGENTS.md](../../AGENTS.md), [hub/package.json](../../hub/package.json), and [hub/src/server.ts](../../hub/src/server.ts).

Findings:
- The backend already exists: the hub, a plain `node:http` server with `GET /health` and `POST /ask`, running keyword/Laya matching and Gemma through llama.cpp (`node-llama-cpp`) and ONNX.
- The hub has no database. Logs are JSONL files in `hub/logs/`.
- The web app is an offline-first PWA that queues questions on the phone and syncs to the hub.

Recommendation given: keep the Node + TypeScript hub, do not move to a cloud framework or BaaS. If the pilot needs more, add SQLite (`better-sqlite3`) on the hub for the question and feedback log, and a small Hono or Fastify layer only if routes grow past `/health` and `/ask`. Any central/cloud store for several hubs should be a later, separate step that only receives synced logs.

## Decisions
- Node/TypeScript stays because `shared/` (matcher, guardrail, answer composition) is imported by both web and hub, and the local models (`node-llama-cpp`, `onnxruntime-node`, `@receptron/laya`) are Node packages.
- Cloud or BaaS backends (Supabase, Firebase) rejected for the answer path: the village hub must work with no internet.
- Python (FastAPI) rejected: it would duplicate `shared/` and the Laya/Gemma integration already working in Node.

## Verification
Read files only. Nothing was run or tested.

## Follow-ups
Team decision still open: whether a central server is wanted at all (aggregated farmer logs, knowledge updates across hubs). Also the existing "Hub network" pending decision (https web app vs http LAN hub).
