# Remove the model source label from chat replies

- Date: 2026-10-09
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done

## Task
Remove the "Keyword/Laya + Gemma sa hub" line shown under each reply in the chat.

## What changed
- [web/src/App.tsx](../../web/src/App.tsx): removed `sourceOf` and the `source` prop.
- [web/src/components/AnswerView.tsx](../../web/src/components/AnswerView.tsx): removed the `source` prop and the line that showed it.
- [web/src/config/labels.ts](../../web/src/config/labels.ts): removed `sourceHub` and `sourcePhone`.
- Replies no longer say which model wrote them ("... sa hub", "Gemma sa device").

## Decisions
Removed the label entirely instead of hiding it with CSS, so no unused code is left behind.

## Verification
- `tsc --noEmit` in web: clean. `vitest run` in web: 33 passed.
- In the built-in browser on http://localhost:3000, sent "hello". The reply showed with no source line under it.

## Follow-ups
None
