# Assess a proposal to run the web app fully offline under 200 MB

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done (research only)

## Task
Review a pasted architecture prompt that asks to drop the hub and `ws` from the web client, run vision, voice, and an SLM on the phone, and keep the total download under 200 MB. Check it against the code before building anything.

## What changed
No code changes.

Findings:
- `ws` is the Go HTTP API, not a WebSocket. Questions already live in IndexedDB (`db.questions`), and conversation sync to `ws` already fails quietly ([web/src/lib/conversations.ts](../../web/src/lib/conversations.ts)).
- The only hard gate is `RequireFarmer` ([web/src/pages/FarmerLoginPage.tsx](../../web/src/pages/FarmerLoginPage.tsx)), which needs a saved claim link from `ws`.
- The phone model today is Gemma 4 E2B q4f16, about 3.1 GB ([web/src/config/models.ts](../../web/src/config/models.ts)). That is far over a 200 MB budget and over a 400 MB heap on 2-3 GB phones.
- Knowledge `signs` and `actions` are English only. The Taglish comes from the model. With no model, the farmer reads English.
- SmolLM-135M is trained on English, so it is a poor fit for Taglish or Cebuano.
- Photos: the hub's design lets a photo add signs but never decide the problem. A pest classifier would decide it. The 27 photos in `eval/photos/` are an eval set, too few to train on.
- Voice: Whisper does not list Cebuano. The Web Speech API on Android usually sends audio to Google, so it is not offline by default.

## Decisions
Stopped before coding. Removing the claim gate, replacing the team's chosen model, and letting a classifier name the problem are product and safety decisions for the team.

## Verification
Read the code only. Did not run the app, tests, or any model, and did not check model file sizes.

## Follow-ups
- Team to decide: local profile without claim, phone model choice, whether a photo classifier may name a problem.
- Cheapest offline win: translated, reviewed `signs`/`actions` in Tagalog and Cebuano in `knowledge/`, shown with no model.
