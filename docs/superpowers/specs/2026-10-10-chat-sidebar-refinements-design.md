# Approved chat sidebar refinements

The user approved the chat/sidebar proposal with no success toasts for rename/delete/pin/unpin.

- Replace browser rename prompts with one native dialog: current title, Save/Cancel, trimmed non-empty validation, pending protection, and retryable inline errors.
- Keep delete confirmation. Mutations update the visible list only after persistence. Missing rows and failed writes must not appear successful.
- At 1024 px and above, show a collapsible in-flow sidebar; below, use a closed-by-default native modal drawer. Reuse content on chat/search, keep 48 px targets, safe areas, independent scrolling, focus return, Escape/backdrop dismissal, and readable enlarged text.
- Header history controls the conversation sidebar rather than the superseded per-chat history dialog. Search also has a visible sidebar toggle.
- New Chat retains saved chats, confirms before discarding unsent text/photo or unsaved questions, closes the mobile drawer, opens /chat, and focuses the composer. Clicking an already empty draft only resets/focuses it; no empty saved row is created.
- Guard late conversation creation, title writes, photo selection, and async status updates from changing a newer draft. Replies remain associated with their original stored question/chat.
- Keep existing display reset and photo/voice failure notifications. Do not add navigation/send/reply/progress success notifications.
- No AI/guardrail changes, new dependencies, schema migrations, ws farmer integration, commits, or pushes. Manual browser/Android verification is a release gate, not replaced by unit tests.
