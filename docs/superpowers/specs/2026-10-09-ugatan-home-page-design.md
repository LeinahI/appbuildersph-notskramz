# Ugatan home-page design

- Date: 2026-10-09
- Status: approved for planning
- Figma frame: Home (1:2) in y0NjRXQf011WO4POLFHpmQ

## Goal

Replace only Ugatan's current home-page presentation with a faithful, responsive implementation of the supplied Figma Home frame. Mobile phones are the priority, with deliberate tablet and desktop behavior. Preserve the existing React/Vite application, matcher, curated knowledge, IndexedDB history, optional phone model, hub synchronization, answer guardrails, and answer rendering.

This work is frontend-only. It does not add or change a backend, API, hub service, model loading, inference, image recognition, diagnosis logic, or agricultural knowledge.

## Reference and constraints

The reference frame is 1166 x 1113 px and contains a centered 520 px application shell. No separate mobile, tablet, or desktop frames are supplied, so responsive behavior outside that frame is inferred and must preserve its hierarchy.

The page uses the exact visible Figma copy except where it would overstate verified capability:

- Replace the generic all-crops claim with copy that names the supported crops, rice and corn.
- Keep the camera affordances in their designed positions, but label them as forthcoming and show a short accessible unavailable notice when activated. They must not accept or analyze an image.
- Keep interface language independent from agricultural-note language and AI-response language.

Figma Code Connect is unavailable on the connected Starter/View seat. Reuse the existing repository components and the Figma-provided SVG assets instead.

## Visual system

- Use self-hosted Manrope for the wordmark and display headings, primarily weight 800.
- Use self-hosted DM Sans for body copy and controls, weights 400, 500, and 600.
- Store only the required WOFF2 variable-font files locally so typography works offline.
- Download and store every visible Figma SVG locally. Do not retain temporary Figma URLs and do not add an icon package.
- Decorative icons use empty alternative text; icon-only controls receive explicit accessible names.
- Extend the existing Tailwind v4 theme with semantic tokens rather than scattering color literals through JSX. The core reference colors are canvas #e9ede5, surface #fafbf7, primary #2b603e, ink #26392d, muted text #6f7c65, border #dbe2d4, and soft surfaces #edf2e7 and #f1f5eb.
- Preserve the restrained borders, shadows, radii, and the subtle composer backdrop from Figma. Add no decorative imagery, animation, or marketing content.

## Page structure

Keep the application as one React entry point with no router or state-management dependency.

The initial home state contains:

1. Header with saved-conversations control, centered Ugatan wordmark, and new-conversation control.
2. Status row with the field-guide/demo label and help control.
3. Hero mark, eyebrow, heading, and supporting copy.
4. Capability-honest photo affordance.
5. Two suggested questions.
6. Supported-crops/account note.
7. Fixed question composer with textarea, forthcoming-photo control, interface-language selector, and send button.
8. A collapsed section below the primary home experience that keeps the existing phone-AI, hub, sync, and saved-question controls reachable.

Reuse AnswerView and QueueList. Add small home-specific components only where they isolate a complete interactive unit, such as the header or composer; do not introduce a general component system.

## Responsive behavior

- Below 520 px, the app occupies the available width with approximately 16-20 px content gutters.
- At 520 px and above, cap the application shell at 520 px and center it on the pale canvas.
- Do not widen the content for tablets or desktops because Figma provides no wider composition.
- Constrain the fixed composer to the shell, account for env(safe-area-inset-bottom), and reserve enough document padding that it never hides the last content.
- Allow translated headings, buttons, labels, and helper text to wrap. Avoid fixed text widths inherited from the generated Figma prototype.
- Maintain touch targets of at least 48 x 48 px and raise essential helper/disclaimer copy to at least 12 px on small screens.
- The verification viewports are 390 x 844, 768 x 1024, the 1166 x 1113 Figma reference, and 1440 x 900.

## Interface localization

Implement interface localization for:

- Tagalog (tl), the default;
- English (en);
- Cebuano/Bisaya (ceb).

Use a typed in-repository translation map instead of adding an i18n package. Every interface key must exist in all three languages at compile time. This includes the new home copy and the existing answer headings, AI status, hub/sync controls, saved-question state, notices, errors, and footer/disclaimer labels.

The compact language label in the composer becomes a keyboard-operable selector. Save the selected value in localStorage, fall back safely to Tagalog when storage is unavailable or invalid, and update document.documentElement.lang whenever it changes.

Changing interface language does not translate curated knowledge entries and does not claim that the AI will answer in the selected language. Existing AI output behavior remains unchanged.

## Interaction behavior

- Sending a typed question uses the existing matchKeywords and ask flow.
- Selecting a suggested question copies its localized text into the request and submits immediately.
- After submission, hand off to the existing answer rendering; redesigning the separate answer screen is outside this task.
- New conversation clears the draft and current answer without deleting IndexedDB history.
- Saved conversations opens and focuses the existing saved-question area.
- Help focuses the composer and announces the existing prompt instruction.
- Photo controls show the localized forthcoming-feature notice and perform no file, camera, model, or network work.
- The send control is disabled for blank input and exposes a localized accessible name.
- The optional advanced section preserves access to current phone-AI preparation, hub URL, synchronization, and queue controls without placing their cards in the primary reference viewport.

## State and data flow

The existing App state and functions remain the source of truth for questions, results, phone-AI status, hub status, and history. Add only interface-language state and the minimum UI state needed to open/focus the existing saved and advanced controls. No new persistent data is introduced besides the interface-language preference.

Changing presentation must not change matcher inputs, database records, model prompts, hub requests, guardrail behavior, or the required pesticide disclaimer.

## Errors and accessibility

- Existing IndexedDB, model, and hub failures continue to use localized notices without exposing technical details.
- Use semantic header, main, section, form, label, button, and list elements.
- All controls must work by keyboard and show a visible :focus-visible indicator.
- Dynamic notices and answer transitions use appropriate live regions without announcing decorative changes.
- The fixed composer must remain usable when the mobile software keyboard is open.
- Do not add motion. Respect reduced-motion preferences if browser behavior introduces scrolling transitions.

## Verification

Before completion:

1. Run the repository's web and root build/test commands that are safe in the current environment. There is no lint script, so do not report lint as run.
2. Add focused tests for language selection/persistence and the new home interactions where existing test infrastructure supports them.
3. Render the home page at all four target viewports and compare the 1166 x 1113 result against the Figma screenshot.
4. Verify typography, text wrapping, spacing, borders, shadows, icon geometry, composer placement, and absence of horizontal overflow.
5. Exercise every visible control and keyboard navigation in all three interface languages.
6. Confirm every Figma asset exists locally, is non-empty, is used in the correct slot, and has the intended rendered dimensions.
7. Report automated checks, browser checks, inferred responsive behavior, missing integrations, and any remaining visual difference separately.

## Out of scope

- Backend, API, or hub-service changes
- Model loading or inference changes
- Image capture, upload, storage, recognition, or diagnosis
- New agricultural knowledge or translation of knowledge entries
- Changing AI response language
- The separate Figma answer, history-dialog, or settings screens
- Router, UI-library, icon-library, or state-management dependencies
- Deployment, commit, or push
