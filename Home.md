# Brylim Langmalakas

Vault home. Each project folder is its own git repo.

## ugatan

Offline Taglish advisor for rice and corn farmers.

- [Project README](README.md)
- [Business plan](docs/BUSINESS-PLAN.md)
- [Disclosure: models, licenses, library versions, pre-kickoff work](docs/DISCLOSURE.md)
- [Offline demo runbook](docs/DEMO.md)
- [Team list](docs/TEAM.md)

## Agent notes

Written by agents after each task. See [AGENTS.md](AGENTS.md) for the format. Newest first.

- [[2026-10-10-branch-and-pr]] - pending work committed on `offline-farmer-login-photo-eval` and opened as a PR
- [[2026-10-10-photo-eval-and-confidence]] - 39-photo eval set and `pnpm eval:photo`; a photo alone is no longer "sure" on one sign (sure-and-wrong 18/31 to 2/31, healthy plants never told a sure problem)
- [[2026-10-10-local-only-offline]] - app reaches no internet: translated cards, chat without account, phone model from the hub, hub-only voice, local-only Laya
- [[2026-10-10-standalone-offline-assessment]] - research only: what a hub-free, under-200 MB web app would need and which parts conflict with team decisions
- [[2026-10-10-split-farmer-admin-login]] - separate farmer (/login) and staff (/admin/login) portals; farmer email/password needs a backend endpoint
- [[2026-10-09-merge-main-into-go-backend]] - merged main into go-backend for PR 1: main's home UI with the sidebar and log-out ported on, lockfile fixed
- [[2026-10-09-ws-docker-init]] - how to init `ws`: Docker Postgres on 5433, migrate, seed, run-api (plus commit-message draft note)
- [[2026-10-09-remove-settings-auto-hub]] - removed settings/Ihanda ang AI; hub defaults to 127.0.0.1:8787
- [[2026-10-09-claim-rebind-device]] - claim re-binds device so a new browser/QR can open `/chat`
- [[2026-10-09-admin-seeder-yaml]] - admin seed from `configs/seeder.yaml`; removed ADMIN_* from config.go
- [[2026-10-09-login-default-admin-email]] - login default + `.env.example` admin email → `admin@ugatan.com`
- [[2026-10-09-ws-admin-migrations-compose]] - compose POSTGRES_* from env; migrations users→invites→conversations; product seed/routes gone; admin seeded
- [[2026-10-09-chat-sidebar-explore]] - mapped farmer chat/Dexie/claim auth/ws for Gemini-style history sidebar planning
- [[2026-10-09-admin-nav-cleanup]] - removed Farmer chat/Login from admin nav; `/` redirects signed-in admins to `/admin`
- [[2026-10-09-chat-sidebar-auth]] - `/chat` sidebar + Dexie/ws sync; `/` unified login; farmer JWT required
- [[2026-10-09-ws-makefile-windows]] - Makefile migrate works on Windows cmd; migrate loads `.env`
- [[2026-10-09-admin-registration-qr-claim]] - `ws` registration/QR/audit + web `/admin` and `/claim`; chat sidebar deferred
- [[2026-10-09-explore-ws-codebase]] - mapped `ws/` Go starter: Product-only DDD sample, Postgres/goose, no auth/QR/chat
- [[2026-10-09-photo-form-recognition]] - photo reading uses a form built from every knowledge entry; the user's corn photo now matches fall armyworm (sure) with a Tagalog reply
- [[2026-10-09-insect-identification]] - 12 insect notes plus insect profiles (English, scientific, and Filipino names, crop stage, natural enemies, last-resort line with PPE), name-weighted matching, and research on sources and open datasets
- [[2026-10-09-chat-behaviour-20-chats]] - 320-message real-model chat test with fixes after each chat: fixed lines for pesticide, health, office, and growing questions, no re-matching of answered problems, problem name always said
- [[2026-10-09-open-source-guardrail-patterns]] - input rail for prompt injection, grounding check on replies, wider dosage guard
- [[2026-10-09-merge-frontend-branch]] - pulled the FrontEnd branch's Figma home UI (green theme, logo, Tulong and history dialogs, tl/en/ceb labels) into the chat, photo, voice, and hub flow; web typecheck and 81 web tests pass
- [[2026-10-09-voice-languages]] - voice measured on real Tagalog and Cebuano speech (about 8% and 11% character error), silence trimming and auto-stop on the phone, 8-bit weights as a setting; farm words and real farmers untested
- [[2026-10-09-voice-input]] - mic button now records and the hub writes the words down with the local Gemma 4 audio model (works offline at localhost:3000); only English test speech tried, Tagalog and Cebuano untested
- [[2026-10-09-photo-recognition]] - farmers can attach a plant photo: the hub reads it with the local Gemma 4 vision model and matches on the signs; works at localhost:3000, accuracy on real photos not tested
- [[2026-10-09-admin-farmer-registration-plan]] - research only: hub has no admin or QR access yet; four decisions needed before building
- [[2026-10-09-push-pending-no-build]] - committed and pushed all pending changes to main without building or testing (user asked to skip the build)
- [[2026-10-09-remove-source-label]] - removed the "Keyword/Laya + Gemma sa hub" label under chat replies
- [[2026-10-09-smarter-chat-replies]] - crop read from the chat, kangkong and other plants go to chat, plain-text replies
- [[2026-10-09-chat-stress-test]] - 3000-turn stress test of the chat, then fixes for off-topic routing, echo questions, complaints, the guard, overlapping requests, and symptom taps; full run in progress
- [[2026-10-09-run-frontend-backend]] - Ran web (port 3000) and hub (port 8787); both respond, hub /ask answered
- [[2026-10-09-push-all-changes-to-main]] - Pushed all pending changes to main; build passed, tests not run

- [[2026-10-09-conversational-replies]] - with no match, Gemma replies to what the farmer said, using the last chat turns
- [[2026-10-09-claude-chat-ui]] - web app is a Claude-style chat; reply is Gemma's explanation of Laya's match, no crop picker
- [[2026-10-09-hackathon-qualification-audit]] - audit against the AppBuildersPH rules: disclosure, demo runbook, team list, and three code fixes; repo is still private and the team list is still empty
- [[2026-10-09-run-pnpm-dev]] - Ran pnpm dev; dev server up at localhost:3000

- [[2026-10-09-web-port-3000]] - web app fixed to http://localhost:3000 (strictPort); all dev servers stopped, but a peer session keeps restarting the old clone on 5173
- [[2026-10-09-connect-web-to-hub]] - hub on 8787 connected to the web app (5174 old clone, 5175 this repo); the app now shows the hub's match once it answers
- [[2026-10-09-home-page-refinements]] - FrontEnd branch: simplified the home UI, added logo and voice controls, and widened desktop chat; rendered QA remains open
- [[2026-10-09-home-page-browser-qa-blocked]] - FrontEnd branch: local page served successfully, but responsive and keyboard QA remain blocked without a connected browser
- [[2026-10-09-ugatan-home-page-implementation]] - FrontEnd branch: implemented the responsive, localized Figma Home frontend; browser comparison remains open
- [[2026-10-09-ugatan-home-page-plan]] - FrontEnd branch: wrote the test-first frontend plan for the responsive, localized Figma Home
- [[2026-10-09-home-page-design]] - FrontEnd branch: approved the responsive Figma Home design, three interface languages, and frontend-only scope
- [[2026-10-09-ui-stack-evaluation]] - FrontEnd branch: keep the existing React PWA stack for the Figma UI; flag HTTPS-to-LAN-hub deployment constraints
- [[2026-10-09-ui-starting-map]] - FrontEnd branch: mapped the existing React UI and the smallest safe starting point for implementation
- [[2026-10-09-backend-recommendation]] - research only: keep the Node/TypeScript hub as the backend; add SQLite on the hub if logs need queries; no cloud or BaaS on the answer path
- [[2026-10-09-push-all-to-main]] - committed and pushed all pending work to main; build and tests not run at the user's request
- [[2026-10-09-multilingual-matching]] - Tagalog, Taglish, Cebuano (Bisaya), and English questions: new keywords plus Gemma's English before matching; blind-ish holdout2 52.8% to 97.2% right, 0 wrong
- [[2026-10-09-readme-local-ai-setup]] - README now says what local AI runs where (phone Gemma, hub Laya, hub Gemma), the setup order, and known issues; holdout scores not quoted
- [[2026-10-09-laya-gemma-roles]] - matcher (keyword/Laya/hybrid) decides the problem and how sure it is; Gemma only explains it, hedges when not sure, and is skipped on no match
- [[2026-10-09-laya-webgpu-speed]] - Laya runs on the GPU with WebGPU (CPU fallback); about 0.1 s per question instead of 1 s, same eval results
- [[2026-10-09-gemma-llamacpp-speed]] - hub Gemma moved to llama.cpp on the GPU with shorter answers; 1 to 2.5 s per answer instead of 12 to 60 s
- [[2026-10-09-gemma-hub-explainer]] - local Gemma E2B now writes the hub explanation (CPU, q4f16); works but takes 12 to 60 s per answer
- [[2026-10-09-laya-option-text-fix]] - fixed Laya option truncation (40.7% to 63.0% correct, 0% wrong) and configured hub/.env
- [[2026-10-09-gemma-english-to-bicolano]] - Gemma English to Bicolano: not supported in the repo, quality untested
- [[2026-10-09-sync-local-model-paths]] - how to point each machine at its own Laya model folder
