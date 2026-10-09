# Unified diagnosis card, follow-up chips, cleaner composer

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: partial

## Task
Redesign the chat answer for a sure match ("Pinutol ang punla, may pink na itlog") so the model text and the Tugma accordion are one card, with a reference picture, one pesticide notice, follow-up chips, and a simpler composer. Related: [[2026-10-10-home-visual-symptom-grid]], [[2026-10-10-help-sheet-redesign]].

## What changed
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx): a sure match is one white card with crop badge, "Mataas na tugma" badge, name, the model's prose, a reference picture beside the signs, numbered steps, an amber "Kumonsulta agad kung" alert, the collapsed English original, and the pesticide notice as the card footer. The accordion arrow is gone. Every assistant reply has the brand avatar and a white bubble. Optional `onFollowUp` / `onRequestPhoto` add the chips (natural control, prevention, send a photo) under the newest answer only.
- [web/src/lib/answer-lead.ts](../../web/src/lib/answer-lead.ts): keeps the model's prose and drops its numbered or bulleted steps inside the card, because the curated steps are listed right below. Search results still show the whole reply.
- [web/src/components/HomePage.tsx](../../web/src/components/HomePage.tsx): the standalone `+` is removed. The symptom picker is now the third item in the Larawan menu. A `photoRequest` counter opens that menu from the chip.
- [web/src/App.tsx](../../web/src/App.tsx): wires the chips to `ask()` and the photo menu.
- [web/src/config/labels.ts](../../web/src/config/labels.ts): new labels in tl, en, ceb. The line under the composer no longer repeats the pesticide advisory.
- [web/src/components/SymptomArt.tsx](../../web/src/components/SymptomArt.tsx): `hasSymptomArt`.
- [web/src/components/ConversationSidebar.tsx](../../web/src/components/ConversationSidebar.tsx), [web/src/index.css](../../web/src/index.css): wider sidebar and thread on large screens; sidebar titles wrap to two lines instead of one ellipsis line.
- Tests: [web/test/answer-lead.test.ts](../../web/test/answer-lead.test.ts) and a card block in [web/test/answer-view.test.tsx](../../web/test/answer-view.test.tsx).

## Decisions
- The notice must still end a treatment answer (AGENTS.md), so it moved into the card footer rather than being removed.
- The reference picture is the existing drawing from `SymptomArt` (a photo in `src/assets/symptoms/` wins if added). It is captioned "Gabay na larawan", not "verified", because there is no photo set.
- The match badge is "Mataas na tugma" only: the matcher gives a yes/no `clear`, not a score, so no percentage is shown.
- The notice does not cite PhilRice/BPI: nothing sources the card text to them.
- No two-tier plan (Agad na aksyon / Pangmatagalang pag-iwas): the knowledge files have one `actions` list, and I did not invent agronomy content.
- The "Tamang taas ng tubig" chip became a generic "Paano maiiwasan" chip, since water depth only fits the snail.

## Verification
- `pnpm test` in `web/`: 28 files, 321 tests passed. `pnpm build` (tsc + vite): passed.
- Browser pane on the existing dev server (port 3000): desktop and 375px phone showed the card, picture, amber alert, one notice, chips; the photo chip opened the menu. Not checked: the Android build, Cebuano and English visually, a real model reply (the hub answered with notes only).

## Follow-ups
- Add `immediate` and `prevention` lists to the knowledge schema and have an agronomist review them, then split the steps in the card.
- Add real field photos as `web/src/assets/symptoms/<id>.webp` for the reference picture.
- Chip questions go through the normal pipeline; check the model's replies to them for the guardrail on a real hub.
