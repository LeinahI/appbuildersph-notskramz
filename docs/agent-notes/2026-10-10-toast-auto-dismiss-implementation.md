# Sileo auto-dismiss refinements

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Implement the approved toast policy: three-second success confirmations, five-second information messages, and errors remaining until dismissed.

## What changed
- Updated [ToastHost.tsx](../../web/src/components/ToastHost.tsx) once in the shared notify helper; no caller changes needed. Expansion/collapse timing uses the same duration for timed notices.
- Updated [toast tests](../../web/test/toast.test.tsx) to cover both durations, sticky errors, localized early dismissal, and matching collapse timing.
- Updated [README.md](../../README.md) and [design.md](../../design.md) to replace the old ten-second policy and explain hover pausing.
- Recorded the [implementation plan](../superpowers/plans/2026-10-10-toast-auto-dismiss.md) and indexed this note in [Home.md](../../Home.md). Preserved unrelated Obsidian edits.

## Decisions
Reuse Sileo's duration handling rather than adding a second timer or notification settings. Retain localized Close/Isara, hover pausing, native-dialog portals, and preference-aware layouts. Important save/AI/validation/safety feedback remains inline; existing voice error toasts stay sticky.
Related: [[2026-10-10-toast-auto-dismiss-review]], [[2026-10-10-sileo-toast-implementation]].

## Verification
- New success/info tests failed against 10,000 ms, then passed after implementation.
- Focused toast/host tests: 7 passed, including existing Space dismissal and modal/preference handling.
- `pnpm build`: passed for shared, hub, and both web entries.
- `pnpm test`: shared 52 passed and web 135 passed. Hub: 76 passed, 10 skipped, missing Laya model suite failed, and Gemma timing assertion failed (15,264 ms versus <10,000 ms). These are the previously recorded hub gates; no hub code changed.
- `git diff --check`: passed, including final documentation updates.
- Browser discovery returned no connected browsers. Unit assertions verify options supplied to Sileo, not real-time browser removal.

## Follow-ups
Browser QA: success/info expiry without hover, pause/restart with hover, sticky errors, dialog transitions, enlarged-text reading, and keyboard-focus dwell. Sileo 0.1.5 exposes no keyboard-focus pause option; this change does not add one or claim full accessibility conformance.
