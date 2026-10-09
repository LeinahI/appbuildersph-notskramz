# Hackathon qualification audit

- Date: 2026-10-09
- Agent: Claude Haiku 5.5 (Claude Code)
- Status: partial

## Task
Check that the project meets the AppBuildersPH Hackathon 2026 qualifying rules and the briefing's gap list, and fix what the repo can fix. The rest needs the team or the organizers.

## What changed
- [docs/DISCLOSURE.md](../DISCLOSURE.md): rewritten. It now covers the pre-kickoff starter commit, the GGUF model, `node-llama-cpp`, the Laya patch and multilingual checkpoint, Hugging Face, jsDelivr, the browser speech service, a corrected network section, the knowledge-base review status, and AI coding tools with the evidence found. Team-only items are marked TEAM TO CONFIRM.
- [docs/DEMO.md](../DEMO.md): new offline demo runbook. It follows the briefing's five segments, lists the offline steps, and marks which steps have not been run.
- [docs/TEAM.md](../TEAM.md): new team list with placeholders. The git authors seen are listed.
- [shared/src/guard.ts](../../shared/src/guard.ts) and [shared/test/guard.test.ts](../../shared/test/guard.test.ts): the guard now also blocks `mg`, `mcg`, `milligram`, and `microgram` doses, and the names Padan, Cartap, Malathion, and Fenobucarb. Three cases added.
- [web/src/App.tsx](../../web/src/App.tsx): one condition. The phone model is skipped when there is no keyword match (`entries.length > 0`), so it no longer writes an explanation for nothing. The rest of the file belongs to an in-progress rewrite and was not touched.
- [web/vite.config.ts](../../web/vite.config.ts): a CacheFirst runtime rule for the pinned onnxruntime-web files on jsDelivr. The phone model's runtime can then start after one online load. Not yet tested offline.
- [README.md](../../README.md): links to the demo runbook and team list. Known issues now cover voice input (needs a network) and the untested offline phone AI.
- [docs/BUSINESS-PLAN.md](../BUSINESS-PLAN.md): the model row, the Qwen to-do (now done in code), and the claim that the notes were agronomist-reviewed (they are not).
- [Home.md](../../Home.md) and [docs/vault-home.md](../vault-home.md): dead links fixed to repo paths.

## Decisions
- Not committed. AGENTS.md says to commit only when asked, so the changes are in the working tree.
- Disclosed the pre-kickoff starter and the rewritten history instead of rewriting history. Whether to present the cleaner history is a team decision.
- Did not revert the user's App.tsx rewrite. One edit of mine landed in it and conflicted with the new `refresh`, so I reverted that line straight away.
- Kept Laya and the hub in the code. The runbook keeps them off the stage.
- Kept voice input and labeled it as network-dependent. The runbook excludes it from the demo.

## Findings the repo cannot fix
- The repository is PRIVATE (`gh repo view`). Judges cannot see it until the owner makes it public or grants access.
- No team names or roles exist in the repo. The business plan's four roles have no owners.
- Authorship. Commits on the other branch by intotheunkownss (9ac5137, d146969, 9b9fcb4) and six unreachable commits in the sibling clone at `E:\Workspace\brylimlangmalakas\ugatan` have the same tree and the same second-level timestamp as commits on `main` under jncdrx. So the author names on `main` were changed, not just the history. The team should be ready to explain this.
- The sibling clone `E:\Workspace\brylimlangmalakas\ugatan` is 10 commits behind `main`, and its history is a separate lineage. Confirm which folder is the submission.
- Working-folder leftovers from the starter: `core/dist/` and `core/node_modules/` (12:45). Gitignored, but they would go into a zip. Delete them before zipping.
- AI coding tools to confirm: Claude Code (version and users), Cursor, Devin.
- Not run: the offline demo on the demo laptop (Chrome WebGPU, network-off reload). Downloading the 3.1 GB phone model needs the owner's permission.
- Organizer questions still open: the submission deadline and time zone, the demo time limit and format, whether the Local AI theme is required, and the judging criteria.

## Verification
- Audit run, before these edits (tree at `165863a`): `pnpm build` exit 0. `pnpm test` passed: shared 52, web 29, hub 87. The real-model hub tests ran (Laya 7, Gemma llama.cpp 6, Gemma ONNX 3). The tracked tree was unchanged.
- After these edits: `pnpm --filter @ugatan/shared test` 55 of 55 (guard 19). `pnpm --filter @ugatan/web build` (tsc and vite) passes, and the generated `sw.js` contains the onnxruntime-web rule. `pnpm --filter @ugatan/web test` 29 of 29.
- Full `pnpm build` exit 0 after these edits.
- Full `pnpm test` after these edits: shared 55 of 55, web 29 of 29, hub 86 of 87. Not green. The one failure is `hub/test/gemma-llamacpp.test.ts`, "writes a non-empty explanation from the matched notes, quickly": it expects under 10 s and measured 12.8 s in the full run and 10.5 s when rerun alone. The audit run passed this file. The cause is unproven. Another server on port 8080 (PID 57056, about 900 MB) was running. The guard runs once on the short output text after generation, so the regex change does not touch the timed path. The threshold was not loosened.
- Browser pane, dev server at localhost:3000 (an existing process, not started by me): the page renders with no console errors. The demo question matches Stem borer, and the page shows its signs, steps, the escalation line, and the disclaimer. Not run: the phone model load, the Gemma explanation, and any network-off reload.

## Follow-ups
- Team: names and roles in [docs/TEAM.md](../TEAM.md). Repository visibility. Confirm the AI tools in [docs/DISCLOSURE.md](../DISCLOSURE.md).
- Demo laptop: run [docs/DEMO.md](../DEMO.md) steps 3 to 10, including the network-off reload. Record the backup video.
- Decide how to present the pre-kickoff history (see the disclosure).
- Fix the hub timing failure: rerun `gemma-llamacpp.test.ts` with the other GPU process stopped, or decide the 10 s limit with the team. Do not loosen it silently.
