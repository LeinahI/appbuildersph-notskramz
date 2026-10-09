# AGENTS.md

Instructions for AI coding agents working in this repo. Read [README.md](README.md) first for what Ugatan is and how to run it.

## Project rules

- Use pnpm 10 and Node 20+. Never use npm.
- Layout: `web/` (React + Vite PWA, also built as an Android APK with Capacitor in `web/android/` by `pnpm --filter @ugatan/web android:apk`; farmers never sign in: first-run setup at `/setup` in the Android app, farmer chat at `/chat` or `/chat/:conversationId` with conversation sidebar, chats only in the phone's IndexedDB; staff login at `/admin/login` and admin at `/admin`, browser build only), `hub/` (Node crop Q&A AI), `ws/` (Go DDD API on Postgres 16 — registration, roles, QR invites, audit, farmer conversations), `shared/` (matcher, guardrail, answer composition), `knowledge/` (one JSON file per problem), `eval/`, `docs/`.
- Build and test from the repo root: `pnpm build`, `pnpm test`. `shared` must be built before `web` or `hub` use it. For `ws/`: Postgres via docker compose, then `make migrate-up`, `make seed` (admin from `ws/configs/seeder.yaml`), `make run-api`.
- Never commit `ws/.env`, `PII_ENCRYPTION_KEY`, or `JWT_SECRET`. Do not store ID images in `ws` or logs.
- Answers never name pesticide brands or give dosages. A reply that gives treatment, control, or spraying advice ends with: "Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide." Greetings, questions, and "not sure" replies do not carry it. Do not weaken the guardrail in `shared/`.
- Never commit `.env` files, model weights, `hub/logs/`, `hub/data/`, or `eval/results/` (see `.gitignore`).
- Only commit or push when the user asks.

## Obsidian notes (required after every task)

This repo root is an Obsidian vault. When you finish a task, write a note about what you did before you report back.

1. Create `docs/agent-notes/YYYY-MM-DD-short-slug.md` (use today's date; lowercase, hyphenated slug).
2. Use this template:

   ```markdown
   # <Short title of the task>

   - Date: YYYY-MM-DD
   - Agent: <model or agent name>
   - Status: done | partial | blocked

   ## Task
   What was asked, in one or two sentences.

   ## What changed
   - Files touched, with links like [shared/src/matcher.ts](../../shared/src/matcher.ts)
   - Behavior that is different now

   ## Decisions
   Why you chose this approach over the alternatives.

   ## Verification
   Commands run and their results (for example `pnpm test`: passed). Say plainly what you did not run.

   ## Follow-ups
   Open questions, known gaps, next steps. Write "None" if there are none.
   ```

3. Add one line for the note under `## Agent notes` in [Home.md](Home.md), newest first: `- [[YYYY-MM-DD-short-slug]] - one-line summary`.
4. Use `[[wikilinks]]` to link to related notes. Use normal markdown links for source files.
5. Keep notes short and factual. Record what happened, including failures. Do not paste secrets, farmer logs, or large diffs.
6. If a task changed nothing (research only), still write the note and put the findings under "What changed" as "No code changes".
