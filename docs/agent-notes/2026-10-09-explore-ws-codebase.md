# Explore ws Go starter codebase

- Date: 2026-10-09
- Agent: Composer (file-search subagent)
- Status: done

## Task
Thorough exploration of `ws/` for directory tree, domain/repos, auth, DB/migrations, HTTP routes, chat relation, go.mod, and gaps vs registration+QR+admin.

## What changed
- No code changes
- Findings: `ws` is a DDD Go starter with one `Product` aggregate; Postgres + goose; unauthenticated product CRUD-ish routes; no auth/QR/admin/chat integration with Ugatan hub/web

## Decisions
Research-only report for the parent agent; Obsidian note required by AGENTS.md.

## Verification
File tree via `find`/`Glob`; read domain, application, infrastructure, transport, cmd, migrations, go.mod, docs. No `pnpm`/`go test` run.

## Follow-ups
None for this research task. Building registration+QR+admin would be greenfield on top of the Product sample.
