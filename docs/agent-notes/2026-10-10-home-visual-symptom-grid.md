# Home screen: visual symptom grid, crop tabs, field action bar

- Date: 2026-10-10
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Redesign the Ugatan AI home screen from a text wall of symptom pills into a visual diagnostic grid with crop tabs and plant-part filters, a camera/voice action bar next to the input, and a de-duplicated header.

## What changed
- [web/src/components/SymptomPicker.tsx](../../web/src/components/SymptomPicker.tsx): Palay/Mais tab control (arrow/Home/End keys), filter chips (Lahat, Dahon, Tangkay, Uhay/Butil, Peste; only chips with results show), card grid that follows its container (2, 3, 4 columns). Inside a chat (`compact`) it is a one-row swipe strip.
- [web/src/components/SymptomArt.tsx](../../web/src/components/SymptomArt.tsx) (new): a flat offline drawing for each of the 20 problems. A photo named `<symptom id>.webp/.jpg/.png` in `web/src/assets/symptoms/` replaces the drawing automatically.
- [web/src/symptoms.ts](../../web/src/symptoms.ts): each symptom now has a short title, a cue line, a plant part and a `pest` flag. `labelTl` is unchanged and is still the text sent when a card is tapped.
- [web/src/components/HomePage.tsx](../../web/src/components/HomePage.tsx): header keeps history only on phones; the new-chat button only shows in a chat and only when the sidebar is not open; display settings, a new online/offline badge ([NetworkBadge.tsx](../../web/src/components/NetworkBadge.tsx), [online.ts](../../web/src/lib/online.ts)) and help are grouped on the right. Camera and voice buttons now carry visible names. Welcome area is wider and shorter on phones.
- [web/src/components/VoiceInput.tsx](../../web/src/components/VoiceInput.tsx): optional `labeled` and `labelClass`.
- [web/src/config/labels.ts](../../web/src/config/labels.ts), [web/src/index.css](../../web/src/index.css), [web/src/App.tsx](../../web/src/App.tsx): new labels in tl/en/ceb, `chat-action-button` and `chat-content-wide`, `sidebarOpen` and `compact` wiring.
- Tests: new [web/test/symptom-picker.test.tsx](../../web/test/symptom-picker.test.tsx), extra cases in [web/test/home-page.test.tsx](../../web/test/home-page.test.tsx).

## Decisions
- Built in the real React/Tailwind app, not Next.js or Flutter, because that is the project's stack.
- The drawings are illustrations, not photos: no licensed field photos exist in the repo and the app must stay offline. The photo override lets the team drop real ones in per symptom.
- Filter chips are Dahon / Tangkay / Uhay-Butil / Peste instead of "Bunga" and "Insekto": rice and corn have panicles and ears, and the golden apple snail is a pest but not an insect.
- Camera and voice stay as one labelled button each in the composer, not duplicate quick-action cards, so there is one mic and recording state. Labels collapse to icons below 340px (welcome) or 410px (in a chat, where the symptom button shares the row).
- The header no longer repeats history and new chat on wide screens, because the sidebar already has them. On phones the history sheet and a chat-only "+" remain.

## Verification
- `pnpm build` (tsc + vite build): passed.
- `npx vitest run` in `web/`: 310 tests passed, 27 files.
- Browser at 1280, 1000 and 375 px: tab switch by click and ArrowRight, Peste filter (6 corn cards), tapping a card starts a chat, header buttons show and hide as intended, no horizontal overflow, in-chat strip fits. After the final fix, interactive controls measured 48px high; the photo menu items were raised from 42px to 48px but not re-measured.
- Not run: real device, Android build, screen reader, outdoor-light contrast check, Cebuano/English visual pass.

## Follow-ups
- Replace drawings with real field photos in `web/src/assets/symptoms/` (one per symptom id).
- Card titles and cues are Tagalog only, like the old `labelTl`.
- The online badge shows device network state only, not whether the hub is reachable.
