# Diagnosis card declutter, no emoji

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Declutter the sure-match diagnosis card and chat view: no emoji anywhere, no nested boxes, a TL | EN switch instead of the English accordion, one disclaimer, quieter follow-up chips. Builds on [[2026-10-10-diagnosis-card-redesign]] and [[2026-10-10-home-visual-symptom-grid]].

## What changed
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx): the card is now an exported `DiagnosisCard`. Typographic tags `Palay` and `Mataas na tugma` (soft fills, no icon, no emoji) sit above the title; a `TL | EN` pill in the top-right swaps signs, steps and the expert-call line in place (only when a translation exists). The picture has no border or caption. Steps use soft numbered dots with `leading-relaxed`. "Kumonsulta agad kung" is a borderless `bg-amber-50/60 text-amber-900` strip with a line icon. Insect facts and the last-resort note lost their boxes. The pesticide advisory is one quiet line at the foot of the card. Follow-up chips are one scrolling row of text pills with monochrome line icons (leaf, shield, camera), 48px tall.
- [web/src/components/CropIcon.tsx](../../web/src/components/CropIcon.tsx) (new) replaces the 🌾 and 🌽 on the crop tabs in [SymptomPicker.tsx](../../web/src/components/SymptomPicker.tsx).
- [web/src/components/HomePage.tsx](../../web/src/components/HomePage.tsx): the "Gabay lamang ito" line under the input now shows only on the welcome screen, not in a chat.
- [web/src/config/labels.ts](../../web/src/config/labels.ts): removed `originalEnglish` and `referencePictureCaption`; added `notesLanguageLabel`; "Magpadala ng litrato" is shorter.
- Tests: updated [web/test/answer-view.test.tsx](../../web/test/answer-view.test.tsx); new [web/test/no-emoji.test.ts](../../web/test/no-emoji.test.ts) fails the build if any emoji enters `web/src`.

## Decisions
- The pesticide sentence stays, once, at the base of the card, because AGENTS.md and `carriesNotice` require a treatment answer to end with it. The second line under the input was dropped in chats instead.
- The model's own prose above the signs stays in Tagalog when EN is chosen, since only the curated notes exist in English.
- No "immediate action vs prevention" split: the knowledge files have one `actions` list and I did not invent content.
- Kept the single outer card border; everything inside is separated by spacing only.

## Verification
- `npx vitest run` in `web/`: 29 files, 323 tests passed. `pnpm build`: passed (run before the last test-only change).
- Browser (dev server on 3000): card rendered with tags, split picture and signs, numbered steps, amber strip, one footer line and one chip row; EN switched the notes in place and TL switched back; no `<details>` and no bordered boxes inside the card.
- Not checked: a real phone, Cebuano visually, the full-height card at 375px after the final edit.

## Follow-ups
- Add a prevention list to the knowledge schema to split steps properly.
- Real photos in `web/src/assets/symptoms/`.
