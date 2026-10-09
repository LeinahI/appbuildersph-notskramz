# Answer Tagalog, Taglish, Cebuano (Bisaya), and reworded English questions

- Date: 2026-10-09
- Agent: Claude Opus 5.5
- Status: done

## Task
Make sure a farmer who writes in Taglish or in different words still gets an answer, covering Bisaya, Tagalog, Cebuano, and English. Bisaya is treated as Cebuano.

## What changed
- [knowledge/*.json](../../knowledge/): about 230 new keyword phrases across the 8 entries, in English (sign phrasing), Tagalog, and Cebuano. Dropped the single words that misfired (`pale`, `amag`, `underside`, `mubo`, `puting amag`). No keyword is shared between entries.
- [shared/src/prompt.ts](../../shared/src/prompt.ts): new `DESCRIBE_SYSTEM_PROMPT`, `buildDescribeMessages`, `NO_SIGNS`. Gemma rewrites the question as plain English signs, never names a problem, and has a Tagalog and Cebuano farm glossary.
- [hub/src/explain/gemma-llamacpp.ts](../../hub/src/explain/gemma-llamacpp.ts): the llama.cpp explainer also implements `Describer` on a second context sequence (cached prompt per job) and shares the one-at-a-time queue. The ONNX route does not describe (too slow).
- [hub/src/matchers/hybrid.ts](../../hub/src/matchers/hybrid.ts): `createHybridMatcher(keyword, laya, { describe, englishKeyword })`. Order: keyword on the farmer's words, then Gemma's English, then keyword (minScore 2) on the English, then Laya on the English. Laya's clear pick counts only if keyword also found that problem. The English goes in `MatchOutcome.english` and the `match` log event.
- [hub/src/matchers/keyword.ts](../../hub/src/matchers/keyword.ts): `minScore` option. [hub/src/main.ts](../../hub/src/main.ts): Gemma loads before the matcher so hybrid can use it.
- Eval: `ceb` language in [eval/lib/csv.ts](../../eval/lib/csv.ts) and [eval/lib/score.ts](../../eval/lib/score.ts), `--describe` in [eval/run.ts](../../eval/run.ts). New sets [eval/descriptions-holdout.csv](../../eval/descriptions-holdout.csv) (53 rows, 18 Cebuano) and [eval/descriptions-holdout2.csv](../../eval/descriptions-holdout2.csv) (36 rows, 9 per language).
- Tests: new [hub/test/keyword.test.ts](../../hub/test/keyword.test.ts), describe cases in [hub/test/hybrid.test.ts](../../hub/test/hybrid.test.ts), [shared/test/prompt.test.ts](../../shared/test/prompt.test.ts), and real-model describe tests in [hub/test/gemma-llamacpp.test.ts](../../hub/test/gemma-llamacpp.test.ts).
- [README.md](../../README.md): "Languages and reworded questions" section, a dated results bullet in Pending decisions, `--describe` and `ceb` in Commands, Cebuano in "Add a knowledge entry". Kept the other session's edits from [[2026-10-09-readme-local-ai-setup]].

## Decisions
- Gemma translates, the matchers decide (see [[2026-10-09-laya-gemma-roles]]). Laya is English-only and keyword knows a fixed word list. Gemma is the only model here that reads all four languages, so it normalizes the words and does not pick the problem.
- Without the glossary, Gemma E2B read Cebuano `humay` (rice) as corn on every row.
- The first describe run raised wrong answers (Laya was confident on vague English, and Gemma made up "pale"). Hence minScore 2 on the English, the Laya-must-agree-with-keyword rule, and examples of vague questions in the prompt.
- Laya on Gemma's English beat dropping Laya after the describe step (seen sets: 1 to 2 more right, same wrong).

## Verification
- Baseline on holdout2 before any change: keyword 50.0% right / 5.6% wrong, hybrid 52.8% / 8.3%.
- `pnpm eval -- --file <set> --describe` after: descriptions 27/27, paraphrase 31/31, holdout 52/53, holdout2 35/36 (97.2%). 0 wrong on every set. Keyword alone on holdout2: 91.7%, 0 wrong. Hybrid passes the verdict on paraphrase, holdout, and holdout2.
- holdout2 is partly blind: written before the keyword and prompt changes, but its baseline was seen, and the Laya-agreement rule came after its first run (34/36, 2 wrong).
- `pnpm test`: shared 52, web 29, hub 87 passed, including the real Laya and Gemma tests.
- Built hub on 127.0.0.1:8811 (hybrid + Gemma): one question each in Cebuano, Tagalog, Taglish, and English were answered with the right problem in 1.2 to 1.9 s. A vague Cebuano question got "Hindi ako sigurado" and the agriculturist line. Hub stopped afterwards.
- Not run: the phone in a browser. The phone gets the new keywords but not the describe step.

## Follow-ups
- Cebuano and Tagalog rows and keywords were written by the agent. A native Cebuano speaker and an agriculturist should review them, then write a fresh blind set.
- Answers stay Taglish for every language. Cebuano answers for Cebuano farmers is a team call.
- The phone AI could run the same describe step before keyword matching. Not done.
- Two BPH rows that never say "brown" stay "not sure".
