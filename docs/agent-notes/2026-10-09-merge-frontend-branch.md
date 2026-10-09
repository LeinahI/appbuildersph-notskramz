# Merge the FrontEnd branch into the chat, photo, voice, and hub flow

- Date: 2026-10-09
- Agent: Claude Sonnet 5.5
- Status: done

## Task
Pull `origin/FrontEnd` (one commit, the Figma home UI) into this checkout and make the UI match the process the app already has: the chat thread, photo, voice, symptom picker, and hub settings.

## What changed
No git merge or commit was made. FrontEnd branched from `165863a`, and both sides had edited `web/` (ours also uncommitted), so the files were merged by hand into the working tree. A backup of the tree from before the merge is in the session scratchpad only.

Taken from FrontEnd as is: [web/public/](../../web/public/) (logo and home SVGs), [HelpDialog.tsx](../../web/src/components/HelpDialog.tsx) (edited), [QueueList.tsx](../../web/src/components/QueueList.tsx), [index.css](../../web/src/index.css), [main.tsx](../../web/src/main.tsx), [index.html](../../web/index.html), [package.json](../../web/package.json) (Manrope and DM Sans fonts), [pnpm-lock.yaml](../../pnpm-lock.yaml), its web tests, and its docs under `docs/agent-notes/` and `docs/superpowers/`.

Merged with our flow:
- [App.tsx](../../web/src/App.tsx): all chat logic is ours (session id, routing, follow-ups, photo, phone AI, hub sync). Only the view changed: the thread renders inside FrontEnd's home layout, with a history dialog (QueueList), the Tulong dialog, and the settings dialog.
- [HomePage.tsx](../../web/src/components/HomePage.tsx): FrontEnd layout plus a working photo button and preview, the symptom picker (welcome screen and a toggle during a chat), a settings button, the hub-aware mic, and the pesticide footer line.
- [VoiceInput.tsx](../../web/src/components/VoiceInput.tsx): hub recording and transcription (ours) with FrontEnd's labels, language locale, and always-visible button. It now says so when the device has no voice option. Another session has since added silence trimming and auto-stop on top ([recorder.ts](../../web/src/lib/recorder.ts), [speech.ts](../../web/src/lib/speech.ts)); that work was left alone.
- [AnswerView.tsx](../../web/src/components/AnswerView.tsx): our single-reply logic and notice rule, restyled green, with headings from `labels`.
- [labels.ts](../../web/src/config/labels.ts): FrontEnd's tl/en/ceb structure with every key our flow needs added in all three languages. Cebuano copy for the new keys is developer-written and needs a native speaker.
- [SettingsDialog.tsx](../../web/src/components/SettingsDialog.tsx), [SymptomPicker.tsx](../../web/src/components/SymptomPicker.tsx): restyled. The AI prepare button moved out of settings into Tulong (it shows download progress there).
- [vite.config.ts](../../web/vite.config.ts): our port 3000 and ONNX caching kept; green theme colors and the svg/woff2 precache glob from FrontEnd. [README.md](../../README.md), [Home.md](../../Home.md), and `.gitignore` updated.

Not brought over: `.codex-tmp/` (a Codex scratch cache with binaries, committed by mistake on FrontEnd; now in `.gitignore`), `docs/agent-notes/.obsidian/workspace.json` (editor state), `web/skills-lock.json`.

Behavior that is different now: the app uses FrontEnd's light green design instead of the warm Claude-style theme (no dark mode); Enter sends only on desktop with a fine pointer (Shift+Enter or a phone Enter adds a line).

## Decisions
FrontEnd's later refinements removed hub settings, manual sync, the symptom picker, and photos, and its tests asserted they were gone. Those are part of the existing process (a farmer unsure of the word taps a picture; the hub reads photos and voice), so they stayed and the tests were changed to match. Our AnswerView kept its rule that only treatment advice carries the pesticide notice; FrontEnd's version appended it to every reply, which breaks the AGENTS.md rule. Our `aiBlocked` and `photoUnavailable` wording won where keys collided.

## Verification
- `pnpm install`: ok (two font packages added).
- `tsc --noEmit` in `web/`: clean.
- `vitest run` in `web/`: 8 files, 81 tests passed (answer-view, app, help-dialog, home-page, labels, queue-list, recorder, voice-input).
- Browser at localhost:3000 (hub not running): welcome screen, typed question with Enter, thread with match card and pesticide notice, settings, Tulong, and history dialogs all work; 320 px wide has no horizontal overflow and all images load.
- `pnpm test` at the root: web passed; hub reported 3 failed files, 2 failed tests, all timeouts in model-loading tests. `hub/` was not touched by this task, so those were not investigated.
- `vite build` in `web/`: passed (about 70 s; PWA precached 31 files, including the font and SVG assets).
- Not run: photo upload and hub voice against a live hub, tablet and Figma-frame viewports, Tagalog speech.

## Follow-ups
- Nothing is committed. If the FrontEnd history should be recorded, commit this and merge `origin/FrontEnd` with `-s ours`, or ask for it to be done.
- Native review of the Cebuano labels.
- Run the hub and try a photo and a voice question in the new UI.
- Decide whether the app needs a dark mode again; the old theme's is gone.
