# Claim: allow re-bind device on valid invite

- Date: 2026-10-09
- Agent: Composer
- Status: done

## Task
Second browser got `user already claimed` on a claim URL; expected to reach `/chat`.

## What changed
- [user.go](../../ws/internal/domain/user/user.go): `MarkClaimed` rebinds `device_id` instead of returning `ErrAlreadyClaimed`
- Claim page messages for used/expired QR; redirect to chat if this device already has a claim
- Persist user before invite consume update order tweak

## Decisions
One farmer, one active device at a time; a fresh single-use invite may move the link to a new browser.

## Verification
`go test ./internal/domain/user/...`

## Follow-ups
Restart `ws` API so the fix is live. For a token already consumed, admin must Regenerate QR.
