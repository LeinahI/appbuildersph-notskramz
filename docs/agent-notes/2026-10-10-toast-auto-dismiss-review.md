# Toast auto-dismiss review

- Date: 2026-10-10
- Agent: Codex
- Status: done

## Task
Review whether Sileo notifications should disappear automatically after about three seconds following user QA.

## What changed
- No application code changes.
- Inspected [ToastHost.tsx](../../web/src/components/ToastHost.tsx) and [toast tests](../../web/test/toast.test.tsx): success/info use 10,000 ms, errors use null (sticky), and every toast has localized dismissal.
- Inspected installed Sileo 0.1.5: its dismissal timer pauses while hovered and restarts for the full duration after the pointer leaves. Autopilot expand/collapse is separate from dismissal.
- Proposed three seconds for short success confirmations, five seconds for ordinary information, and persistent inline feedback for essential errors/actions. Retain manual early dismissal.
- Added this review to [Home.md](../../Home.md).

## Decisions
Avoid one three-second timeout for all messages: low-vision and slower-reading users may miss longer or essential content. W3C explains that temporary notifications can be appropriate when equivalent information remains available without a timer; a longer fixed timeout alone does not establish accessibility compliance.
Sources: [Sileo API](https://sileo.aaryan.design/docs/api), [WCAG timing guidance](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html).
Related: [[2026-10-10-sileo-toast-implementation]], [[2026-10-10-toast-display-preferences-approach]].

## Verification
Read current helper, tests, installed library timer source, and official documentation. No build, automated tests, or browser reproduction run for this review. Final whitespace check recorded separately.

## Follow-ups
Approve the duration policy before implementation. Identify the exact QA toast; if success/info remains after ten seconds without hovering, reproduce its timer behavior before treating this as only a duration change. Verify automatic dismissal and keyboard-focus protection during implementation.
