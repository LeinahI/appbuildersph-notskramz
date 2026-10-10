# Explore ws auth, register, QR invites

- Date: 2026-10-10
- Agent: Auto (file-search subagent)
- Status: done

## Task

Map `ws/` user registration, QR invites, and authentication (migrations, endpoints, farmer vs admin, agent notes, old RegisterPage contract).

## What changed

- No code changes (research only).
- Key note: [[2026-10-10-admins-table-email-login]] — staff moved to `admins`; farmers stay on `users` + QR claim.
- Related: [[2026-10-10-split-farmer-admin-login]] — farmer email/password UI calls a non-existent `/api/v1/auth/farmer/login`.

## Decisions

N/A (read-only).

## Verification

Read migrations `000001`–`000004`, router, registration handler/service, domain user/admin, openapi, RegisterPage, ws-api, agent notes. No build/test.

## Follow-ups

Clarify whether a "revert" targets (a) undoing `000004`/`admins`, or (b) dropping unused farmer email/password UI / leftover `users.email`+`password_hash` columns after staff split.
