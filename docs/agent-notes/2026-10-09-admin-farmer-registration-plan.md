# Admin farmer registration and QR access: research and plan

- Date: 2026-10-09
- Agent: claude-haiku-5-5
- Status: blocked

## Task
The user asked that the hub act as an admin console. Staff would enter a farmer's details (age, gender, address) or scan an ID to autofill them. Then the admin generates a QR code that the farmer scans to get access to the app. The user also asked to fix the prompt and improve the process.

## What changed
No code changes. Research only.

- The hub has no admin UI, no registration, and no QR code. The only routes are `GET /health`, `POST /ask`, and CORS preflight, in [hub/src/server.ts](../../hub/src/server.ts).
- The hub starts from [hub/src/main.ts](../../hub/src/main.ts). It loads the matcher and explainer, then calls `createHubServer`.
- The web app has no login or access gate. Its only hub link is the hub URL in [web/src/App.tsx](../../web/src/App.tsx).
- No personal-data storage exists. `hub/logs/` and `hub/data/` are gitignored.
- The "fix prompt" request is ambiguous. The prompts live in [shared/src/prompt.ts](../../shared/src/prompt.ts): the system prompt, the match verdict text, the describe prompt for Gemma's English, and the chat prompt. The user has not said which one is wrong.

## Decisions
Blocked on choices only the user can make:

1. Which ID method for autofill: decode the QR code on the ID, OCR the printed text, or type the details by hand.
2. How the QR grants access: a signed one-time token that the phone exchanges with the hub, or a plain registration ID.
3. Which prompt to fix, and what is wrong with it.
4. Data retention: whether an ID photo is kept (recommend: not kept) and where records live (recommend: `hub/data/`, gitignored).

Privacy note: this collects personal data about farmers. Consent and retention rules should be confirmed before any build.

## Verification
Read the files above. No build or test was run because nothing changed.

## Follow-ups
Waiting for the user to answer the four decisions above before building. Then build the hub admin endpoints, the admin page, QR generation, and the phone-side access check.
