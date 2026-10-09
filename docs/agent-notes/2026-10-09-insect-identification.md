# Insect identification answers (names, crop stage, natural enemies, last resort)

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
The user pasted an insect-identification system prompt (English, scientific, and Filipino names; crop and growth stage; damage; cultural, biological, and chemical management in simple Taglish) and said "research open source then implement".

## What changed
- Research (web, public extension sources; no repo change). Findings below.
- [shared/src/types.ts](../../shared/src/types.ts): optional `insect` profile on a knowledge entry (`commonName`, `scientificName`, `localNames`, `stages`, `stageNote`, `biological`).
- [shared/src/knowledge.ts](../../shared/src/knowledge.ts): validates the profile and runs the pesticide guardrail over its text.
- [shared/src/insect.ts](../../shared/src/insect.ts): `insectFacts`, `LAST_RESORT` (pesticide is the last option, wear gloves, mask, long sleeves, boots).
- [shared/src/answer.ts](../../shared/src/answer.ts) and [shared/src/prompt.ts](../../shared/src/prompt.ts): the offline answer and the model prompt carry the insect line and the new order of the answer. The system prompt stays fixed text, because the hub caches it.
- [shared/src/keyword.ts](../../shared/src/keyword.ts): an insect's own name (common, scientific, local, plural) counts double, and a phrase inside a longer matched phrase of another entry does not count ("atangya" vs "itim na atangya"; "fall armyworm" vs "armyworm").
- [knowledge/](../../knowledge/): 12 new insect notes (rice bug, rice black bug, green leafhopper, rice leaffolder, rice caseworm, rice armyworm, rice whorl maggot, corn planthopper, corn earworm, corn armyworm, corn leaf aphid, common cutworm) and profiles added to bph, stem-borer, fall-armyworm, asiatic-corn-borer.
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx), [web/src/config/labels.ts](../../web/src/config/labels.ts), [web/src/symptoms.ts](../../web/src/symptoms.ts): insect block, natural enemies, last resort in tl/en/ceb; a picker tile per new entry.
- [eval/descriptions-insects.csv](../../eval/descriptions-insects.csv): 31 labeled rows. The hub example test reads it too.
- Tests: [shared/test/insect.test.ts](../../shared/test/insect.test.ts), plus web and hub test edits.
- Docs: README (add-an-entry steps, Laya note), DISCLOSURE, DEMO, BUSINESS-PLAN counts (eight became twenty).

## Research findings
- Best Philippine sources: PhilRice leaflet "Harmful organisms in Philippine rice fields" (Filipino names), PhilRice web articles ("public domain unless otherwise stated"), DA-Caraga corn technoguide *Mga Dangan sa Mais* (no licence stated), UPLB abstracts. ACIAR/IRRI Lucid fact sheets are all rights reserved, so facts only. IRRI Rice Knowledge Bank, CABI, and FAO OpenKnowledge could not be fetched.
- Name map: Atangya = rice bug, itim na atangya = rice black bug, aksip = stem borers, harabas/arabas/tagustos = armyworm caterpillars (not fall armyworm only). Most regional names (Ilocano, Cebuano, Bicol, others) are from the one DA-Caraga guide. No Bisaya, Hiligaynon, or Waray name was found for any rice insect.
- Open datasets for a later photo model. Commercial use allowed (CC BY 4.0, read on the source page): Paddy Field Pest (Bangladesh, rice), MLD Maize Leaf Disease (fall armyworm), CCMT (Ghana maize), PlantDoc (diseases only). Academic only: IP102 and every copy of it, PestNet. Unclear: Zenodo rice-pest set, PlantVillage, Roboflow uploads, iNaturalist (per photo, and its terms may bar commercial AI training). No open Philippine insect photo set was found.

## Decisions
- Kept the matcher in charge: the model only explains the matched note. The insect profile lives in the knowledge file, so every name is sourced and reviewable, and the model never invents one.
- Changed the pasted prompt on one point: its chemical step says to name "targeted active ingredients". The project rule bans active ingredients and doses, so the chemical step says pesticide is the last option, on the agriculturist's advice, with PPE.
- Left out gall midge and rice hispa (not confirmed in the Philippines), thrips and mole cricket (no sourced local name), and termites (no source). Armyworm species is uncertain, so the note says `Mythimna sp.`.
- Name boost in the matcher instead of more keyword lists, because naming the insect ("atangya") is the strongest signal a farmer can give.

## Verification
- `pnpm --filter @ugatan/shared build` and `npx vitest run` in shared: 241 passed.
- web: `tsc --noEmit` clean, `vitest run` 135 passed.
- hub (not the Laya and llama.cpp files): answer, config, conversation, conversation-safety, keyword, hybrid, examples, server, photo, voice, gemma (real ONNX model), gemma-trim, laya-options: 173 passed. One earlier `server.test.ts` failure ("bph" not matched) did not repeat on re-run, while another session was editing `shared/`; not explained.
- Keyword matching on `descriptions-insects.csv`: 31 of 31. The four existing eval files score the same as before the new entries (no wrong answers, same not-sure counts). I tuned keywords against the insect rows, so that figure is optimistic.
- Not run: the full `pnpm test` (the Laya and llama.cpp tests crash or time out on this machine, as they did before my changes); Laya or hybrid on the 20 notes; a real Gemma answer for an insect with the new prompt (started, stopped because the CPU was busy); a browser check of the card (the dev hub on port 8787 is an older process and was slow, so the card did not render; the card is covered by `renderToStaticMarkup` tests only).

## Follow-ups
- Laya: with 20 options each gets about 8 tokens (see README, "Laya bundle"). Re-run `pnpm eval` with Laya before turning it on. Keyword stays the default.
- Restart the hub so it loads the new notes and prompt.
- Have an agronomist review the 20 notes, especially the single-source regional names.
- Run one real Gemma answer for rice-bug and check the order: names, crop and stage, damage, steps, last resort.
- The symptom picker now shows 20 chips on the empty screen; consider grouping or a "show more".
- Ask PhilRice or DA-BPI for written permission before shipping the paraphrased facts commercially.
