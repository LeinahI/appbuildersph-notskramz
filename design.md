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

### Chat navigation and sidebar

- The left header control toggles the conversation sidebar, not a separate question-history dialog. Search has the same accessible toggle.
- At 1024 px and wider, use a collapsible 288 px in-flow panel. Smaller screens use a closed-by-default native modal drawer, independent scrolling, safe areas, focus return, and Escape/backdrop dismissal. Persist only the desktop open preference.
- Chat selection and actions are sibling buttons with 48 px minimum targets. Keep titles compact with their complete text available; action labels and dialogs wrap with enlarged text.
- Rename uses a prefilled native dialog with Save/Cancel, trimmed non-empty validation, pending protection, and editable inline retry errors. Deletion requires confirmation. Reflect changes only after persistence and refresh search results.
- Header/sidebar New Chat share one flow: confirm before discarding unsent text/photos or unsaved questions, retain saved chats, open the empty /chat draft, and focus its composer. Save a conversation only on its first sent question.
- Keep sends blocked while a deep-link chat is unresolved, preserve typing during its initial load, and offer retry if loading fails. Late async work must not select an old chat, attach an old photo, or overwrite a newer draft.

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
- Display ongoing listening status and important errors below the composer as muted live status text. Brief photo/voice availability notices use the shared Sileo toast host.

## Responsive and accessibility requirements

- Design for 320 px-wide phones first; support tablet and desktop without changing the chat hierarchy.
- Use responsive type and wrapping rather than truncating translated copy. Preserve 48 px minimum touch targets.
- Support keyboard operation everywhere. Keep the global `:focus-visible` treatment: 3 px green outline with offset; suppress the textarea's individual outline only because the composer itself supplies the focus state.
- Use semantic `header`, `main`, `section`, `form`, `label`, and `button` elements. Labels must remain available to screen readers.
- Keep page motion absent. The requested Sileo notifications may animate at standard settings; use their wrapping card layout for reduced motion and enlarged text.

### Notifications

- Do not show success toasts for renaming, deleting, pinning, or unpinning chats. The persisted sidebar state is the confirmation; keep deletion confirmation and clear failure feedback.
- Use the shared `notify` helper and `ToastHost` for brief event feedback on farmer and admin pages. Keep validation, important failures, progress, and agricultural safety content inline.
- Toasts inherit display preferences and use localized copy, visible 48 px dismissal targets, and top placement clear of the composer. Short success confirmations auto-dismiss after 3 seconds; information after 5 seconds; errors remain until dismissed. Retain early dismissal and Sileo's hover pause. Essential information must also remain available without a timer; a fixed timeout alone is not an accessibility guarantee.
- The host follows the active native dialog. Enlarged text, narrow viewports, keyboard focus, high contrast, and reduced motion use a wrapping card rather than fixed SVG geometry.

### Display preferences

- Keep only the labeled size, weight, and contrast choices, reset, and essential save-failure feedback. The settings text is the live preview; do not add a separate preview or explanatory paragraphs.
- Farmer and admin preference dialogs keep a text-independent outer frame, bounded by the viewport. Text inherits the selected preferences, wraps, and scrolls inside; the close control stays reachable. Do not scale the whole modal or clip enlarged text.

## Content and localization

- Default interface language is Tagalog. Use the existing typed label map for all visible copy; never hard-code user-facing text in a component when a label exists.
- Keep language concise, reassuring, and capability-honest. Photos use the existing camera/gallery and on-device/hub processing flow; distinguish unavailable processing from a failed photo read.
- Never make the UI imply a diagnosis, pesticide recommendation, brand, or dosage. Preserve the application's required safety disclaimer and existing answer guardrails.

## Implementation rules

- Reuse `HomePage`, `AnswerView`, `QueueList`, existing CSS component classes, local assets, and the current Tailwind theme before adding anything new.
- Make the smallest change that satisfies the request. Avoid new dependencies, a router, a design system, global state, or a component abstraction for a one-off element.
- Test behavior at a minimum on a narrow phone and a desktop width. Confirm there is no horizontal overflow, the composer remains reachable with the software keyboard, and all visible controls can receive focus.
