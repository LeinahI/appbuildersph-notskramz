# Ugatan help and Tagalog home

- Date: 2026-10-09
- Agent: Codex (GPT-6)
- Status: partial

## Task
Restore the top Tulong icon with an understandable local AI guide, remove the composer language selector, and replace the greeting with a concise Tagalog introduction and the supplied UgatanLogoIcon.svg.

## What changed
- [HomePage.tsx](../../web/src/components/HomePage.tsx): restored the accessible help action, removed the language selector and its callbacks, and replaced the welcome artwork/copy with the supplied icon and Ugatan AI introduction.
- [HelpDialog.tsx](../../web/src/components/HelpDialog.tsx): added a native modal with numbered Tagalog instructions, microphone/photo limits, optional local AI preparation, state feedback, download disclosure, and the exact pesticide disclaimer.
- [App.tsx](../../web/src/App.tsx): uses Tagalog regardless of saved language preferences, opens the help modal, and connects its optional preparation control to the existing phoneAi runtime. Model download starts only after the user presses Ihanda ang AI.
- Updated [labels.ts](../../web/src/config/labels.ts), the affected [web tests](../../web/test), and [README.md](../../README.md). The supplied SVG asset was used without editing it.

## Decisions
- Followed the user's latest refinements to [[2026-10-09-home-page-refinements]]; kept other localization utilities available without exposing a language selector.
- Reused the native-dialog styling and existing runtime; no backend, shared matcher, guardrail, knowledge, or model runtime changes.
- Explained the difference between built-in local guidance and optional AI explanations. The help modal discloses the roughly 3.1 GB first download and notes that preparation is needed after reload.
- Retained 48px header/control targets and constrained the logo to avoid overlapping the new help action on narrow phones.

## Verification
- Web tests: 65 passed across 7 files, including the removed selector, ignored saved English preference, help action, modal states, download disclosure, and exact disclaimer.
- Repository build: passed; the root test command also rebuilt successfully.
- Root tests: web 65 passed and shared 52 passed. Hub had 76 passed, 10 skipped, and one failed Gemma timing test (11,459ms versus 10,000ms); the Laya suite also failed setup because D:\laya\onnx\laya.onnx is missing.
- New SVG confirmed in the PWA precache. Old greeting and selector references are absent from application components. No hub/shared/knowledge/eval files differ.
- Browser connection unavailable. Rendered responsive/modal focus/Escape checks and the actual browser model download were not tested.
- The Git index changed during verification and captured temporary test artifacts. Cleanup initially removed those files; their indexed versions were restored without altering the index. Newer user note entries were preserved.

## Follow-ups
- Check the header, new icon, and modal on a phone and desktop; verify focus restoration and Escape.
- Test optional phone AI preparation on a supported device with adequate Wi-Fi, storage, and memory.
- Review the already-staged .codex-tmp/home-help test artifacts before any future commit.
