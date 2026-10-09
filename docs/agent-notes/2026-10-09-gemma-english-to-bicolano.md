# Can Gemma translate English to Bicolano?

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: done

## Task
The user asked whether the project's Gemma model can translate English to Bicolano (Bikol).

## What changed
No code changes. Findings:
- The repo has no Bicolano support. A search for "bicol"/"bikol" found nothing in source, knowledge, or docs.
- Gemma is only used for Taglish explanations: Gemma 4 E2B on the phone ([web/src/config/models.ts](../../web/src/config/models.ts), [web/src/workers/llm.worker.ts](../../web/src/workers/llm.worker.ts)) and a planned E4B on the hub ([hub/src/explain/index.ts](../../hub/src/explain/index.ts)).
- Nothing in the prompts or the pipeline asks for translation.

## Decisions
Answered from general knowledge of the model. Bikol is a low-resource language, so a small model like E2B is likely to give weak or wrong translations. This was not tested here.

## Verification
Nothing was run. No translation test was done on E2B or E4B.

## Follow-ups
- To find out for sure, run 20 to 30 farm phrases through E2B and E4B and have a native Bikol speaker grade them. This fits the existing Taglish test in [docs/BUSINESS-PLAN.md](../BUSINESS-PLAN.md).
- Safer option if Bikol is needed: translate fixed answer text once with a human reviewer, and store it in `knowledge/`. Do not translate live.
- Any Bikol output must keep the guardrail and the closing "Kumpirmahin sa lokal na agriculturist bago gumamit ng anumang pesticide." line.
