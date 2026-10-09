# Other-crop ASK guardrail fix

- Date: 2026-10-10
- Agent: Composer
- Status: done

## Task
Stop `"pwede ba ako magtanong tungkol sa pananim maliban sa palay o mais"` from getting the ASK canned reply; return the other-crop refusal instead, without weakening pesticide/health/emergency rails.

## What changed
- [shared/src/crop.ts](../../shared/src/crop.ts) — `detectCrop()` strips negated/excluded crop phrases (including `maliban sa palay o mais`) before keyword match
- [shared/src/conversation.ts](../../shared/src/conversation.ts) — `OTHER_CROP_GENERAL`; `fixedReply()` runs OFFICE → CROP_CARE → OTHER_CROP → OTHER_CROP_GENERAL → EAT → IDENTITY → ASK; helpers include the general pattern
- [shared/test/conversation.test.ts](../../shared/test/conversation.test.ts), [shared/test/crop.test.ts](../../shared/test/crop.test.ts) — regression cases

## Decisions
ASK moved after topic guardrails so `magtanong` cannot short-circuit other-crop language. Named `OTHER_CROP` kept for specific vegetables; general pattern covers meta phrases without inventing a crop name in the reply.

## Verification
- `pnpm --filter @ugatan/shared test`: 252 passed

## Follow-ups
None
