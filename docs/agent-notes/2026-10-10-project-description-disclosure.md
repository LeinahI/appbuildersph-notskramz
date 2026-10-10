# Project description and technical disclosure

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Add a project description and technical disclosure. The README already describes the project and `docs/DISCLOSURE.md` already existed but was stale.

## What changed
- [docs/DISCLOSURE.md](../DISCLOSURE.md): added a "Project description" section and a "Technical disclosure" section (architecture table, where the AI runs). Updated stale parts: the Gemma loader is now `Gemma4ForConditionalGeneration`, the LiteRT-LM model and Android/Capacitor/GSAP/Go libraries are listed, the jsDelivr CDN bullet is replaced (runtime is served from `/ort/`), and the data, permissions, runtime, and AI-tool sections are updated.
- Unverified license facts are marked `[TEAM TO CONFIRM]` (LiteRT model source and license, LiteRT-LM library, GSAP).

## Decisions
Extended the existing disclosure instead of creating a second file, because the README already links it. Did not touch README prose or fill in team or tool-usage facts the repo cannot show.

## Verification
Checked versions against `web/package.json`, `hub/package.json`, `ws/go.mod`, `web/android/app/build.gradle`, and the manifest. Docs only: no build or tests run.

## Follow-ups
Resolved on request: LiteRT model (Apache-2.0, base `google/gemma-4-E2B-it`), LiteRT-LM library (Apache-2.0), GSAP (proprietary free Standard License, noted as non-open-source), insect-note count. Remaining `[TEAM TO CONFIRM]` markers are facts only the team knows: whether Claude Code, Cursor, or Devin were used and by whom, and the team roster in TEAM.md. The insect count line is reworded; 16 profiles confirmed by grep, but which 4 original notes are insects was not checked.
