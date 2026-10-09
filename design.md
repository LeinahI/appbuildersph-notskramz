# Ugatan UI/UX Design Guide

Use this guide when implementing or changing Ugatan's interface. Match the existing calm, field-guide chat experience; do not add marketing sections, decorative imagery, animation, or new UI libraries unless the task explicitly requires them.

## Product intent

Ugatan is a mobile-first, offline-capable adviser for rice and corn farmers. The interface should make one action obvious: describe what is happening in the field. It must feel trustworthy, simple, and usable on a phone outdoors.

## Visual language

- **Tone:** restrained, practical, warm, and agricultural without being rustic or ornamental.
- **Typography:** use Manrope for display headings and the Ugatan wordmark; use DM Sans for body copy and controls.
- **Colour:** pale sage canvas/surfaces, deep leaf-green actions and ink, white input surfaces, and quiet green-grey secondary text. Reuse the semantic Tailwind tokens in `web/src/index.css`; do not introduce one-off hex values in JSX.
- **Shape:** generous rounded corners, especially the pill-like composer and circular icon controls. Borders are thin and low contrast; shadows are soft and shallow.
- **Icons:** use the existing local SVG assets. Decorative images have empty alt text; every icon-only button has a localized accessible name and title.

## Layout

- The app is a full-height chat shell: header, scrollable main area, and fixed composer footer.
- Keep content centered and readable: `.chat-content` is at most 760 px wide. Use 16 px horizontal gutters on phones and 32 px from the `md` breakpoint upward.
- Respect `safe-area-inset-top` in the header and `safe-area-inset-bottom` in the footer.
- Do not let the fixed composer cover content. The main area scrolls independently and must not create horizontal overflow.

### Header

- Use a 80 px visual header with a subtle bottom rule.
- Place conversation history at the left; place new conversation and help at the right.
- Keep the Ugatan wordmark visually centered at desktop widths. On smaller widths, preserve the balanced left/right control groups instead of forcing absolute centering.
- All icon controls are circular 48 x 48 px touch targets. The new-conversation control uses the soft leaf fill; other controls are transparent until hover/active.

### Empty state

- Center the hero vertically within the available main area.
- Show the Ugatan icon above the title, then a short supporting paragraph. The icon is decorative.
- Use a bold Manrope title: 28 px on phones and 40 px from `md` upward. Keep the description readable, muted, and limited to about 420 px.
- Avoid extra cards, suggested prompts, statistics, or calls to action in this state unless specifically requested.

### Conversation state

- Replace the empty-state content with the current question and answer content; retain the same header and composer.
- Render the user's question as a right-aligned, pale-leaf bubble with a large rounded shape and a tighter lower-right corner.
- Keep answer content in the normal reading column with clear section headings and spacing. Do not change matcher, guardrail, answer, history, hub, or phone-AI behavior as part of a visual change.

### Composer

- Keep the composer fixed at the bottom inside the content column.
- Use a white, rounded rectangle with a thin green-grey border and a restrained shadow. On focus, show the leaf border plus a visible soft focus ring around the whole composer.
- The textarea has no separate border, starts at 56 px tall, grows with content up to 160 px, and does not allow manual resizing.
- Put photo and voice actions at the lower left; place the circular leaf-green send action at the lower right. The send action is disabled for blank input.
- Desktop users with a fine pointer may submit with Enter; Shift+Enter keeps a newline. Mobile Enter keeps its native multiline behavior.
- Display notices directly below the composer as centered muted status text. Use a live region for these messages.

## Responsive and accessibility requirements

- Design for 320 px-wide phones first; support tablet and desktop without changing the chat hierarchy.
- Use responsive type and wrapping rather than truncating translated copy. Preserve 48 px minimum touch targets.
- Support keyboard operation everywhere. Keep the global `:focus-visible` treatment: 3 px green outline with offset; suppress the textarea's individual outline only because the composer itself supplies the focus state.
- Use semantic `header`, `main`, `section`, `form`, `label`, and `button` elements. Labels must remain available to screen readers.
- Keep motion absent; respect reduced-motion preferences.

## Content and localization

- Default interface language is Tagalog. Use the existing typed label map for all visible copy; never hard-code user-facing text in a component when a label exists.
- Keep language concise, reassuring, and capability-honest. Photo input is not implemented: its controls must show the localized unavailable notice rather than accept, upload, or analyse an image.
- Never make the UI imply a diagnosis, pesticide recommendation, brand, or dosage. Preserve the application's required safety disclaimer and existing answer guardrails.

## Implementation rules

- Reuse `HomePage`, `AnswerView`, `QueueList`, existing CSS component classes, local assets, and the current Tailwind theme before adding anything new.
- Make the smallest change that satisfies the request. Avoid new dependencies, a router, a design system, global state, or a component abstraction for a one-off element.
- Test behavior at a minimum on a narrow phone and a desktop width. Confirm there is no horizontal overflow, the composer remains reachable with the software keyboard, and all visible controls can receive focus.