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

- [[2026-10-10-admin-frontend-at-admin]] - `/admin` serves FrontEnd AdminApp (overview/users/qr/activity), not old top-nav portal
- [[2026-10-10-landing-gpu-machine-note]] - Landing benchmarks label from `node-llama-cpp inspect gpu` (Vulkan · RTX 3060)
- [[2026-10-10-landing-benchmarks]] - Browser `/` landing (GSAP/Motion) + hub `benchmark:landing` → real `benchmarks.json`
- [[2026-10-10-push-all-to-main]] - committed and pushed all pending work to main
- [[2026-10-10-natural-ai-replies]] - palay guides in Tagalog/Bisaya/English, steps on "ano gagawin ko", no repeated questions, plant-part filter, Claude-like style, `pnpm eval:chat` with 20 made-up chats
- [[2026-10-10-hub-serves-litert-model]] - hub now reads PHONE_LITERT_FILE from hub/.env (and .env.example) so it serves the on-phone Gemma .litertlm; served file checked on the hub, phone download untested

- [[2026-10-10-diagnosis-card-declutter]] - diagnosis card has no emoji or nested boxes, a TL | EN switch instead of the English accordion, one quiet pesticide line and calmer follow-up chips
- [[2026-10-10-diagnosis-card-redesign]] - a sure match is one card (picture, signs, numbered steps, amber alert, single pesticide notice) with follow-up chips and a composer without the `+`; tiered steps and real photos still open; 321 web tests pass
- [[2026-10-10-help-sheet-redesign]] - "Paano gamitin" is now a bottom sheet with step and feature cards, a collapsible Offline AI module with a real progress bar, and an amber advisory footer; 313 web tests pass
- [[2026-10-10-mic-diagnosis]] - chat mic works with a reachable hub; on a phone off the hub Wi-Fi it only says to connect, no code changed yet
- [[2026-10-10-home-visual-symptom-grid]] - home screen now has Palay/Mais tabs, plant-part chips, a picture card grid for 20 problems, labelled camera/voice buttons and a de-duplicated header
- [[2026-10-10-conversation-sheet-redesign]] - "Mga usapan" is now a bottom sheet with empty-state quick starts, day groups, search and a quiet privacy footer; swipe actions not built
- [[2026-10-10-conversation-dialog-ui]] - restyled the "Mga usapan" dialog: card items with status pills, 2-line clamp, pill new-chat button, tinted privacy note
- [[2026-10-10-display-dialog-ui]] - segmented controls, sticky reset and stacked options for the display dialog
- [[2026-10-10-voice-hub-flash-empty-fix]] - Mic stop no longer hub-flash then empty; browser STT starts without hub probe
- [[2026-10-10-browser-stt-mic-prime-fix]] - Removed getUserMedia priming that left Chrome STT hearing silence; en-US first
- [[2026-10-10-browser-stt-interim-fix]] - Browser STT kept interim text and committed it on session end
- [[2026-10-10-browser-voice-overlay]] - Browser Web Speech + Google-style mic overlay; hub STT kept for Capacitor
- [[2026-10-10-admin-redirect-loop]] - Vite admin.html stole /admin; renamed to admin-preview.html to stop redirect loop
- [[2026-10-10-admins-table-email-login]] - ws admins table + email/password on green-card and /admin/login
- [[2026-10-10-hub-env-example-align]] - hub/.env.example matched working local .env; fixed HUB_VISION=on6 typo
- [[2026-10-10-admin-auth-local-models]] - admin JWT redirect verified; Dexie-local farmer chats; hub-aware LiteRT/ONNX/Q4_0 routing
- [[2026-10-10-merge-frontend-into-main]] - merged origin/FrontEnd (Figma home UI, admin pages, display preferences, Sileo toasts) into main, keeping no-login /setup, /chat, /search, guardrails
- [[2026-10-10-toast-auto-dismiss-implementation]] - applied 3-second success and 5-second information toasts with sticky errors; build and 135 frontend tests pass, browser timing QA remains open
- [[2026-10-10-toast-auto-dismiss-review]] - reviewed existing timers and hover behavior; proposed 3-second confirmations and 5-second information notices, pending approval
- [[2026-10-10-stable-preferences-dialog]] - removed preference clutter and kept farmer/admin modal frames stable during text resizing; build and 134 frontend tests pass, browser QA remains open
- [[2026-10-10-sileo-toast-implementation]] - implemented preference-aware Sileo notifications across farmer/admin entries; 132 frontend tests pass, browser QA remains open
- [[2026-10-10-remove-registration-display-settings]] - removed preference controls from registration drawer; saved appearance still applies, build and 132 frontend tests pass
- [[2026-10-10-display-preferences-navigation]] - moved preferences to home sliders icon and aligned admin navigation; removed login/help shortcuts, 123 frontend tests pass
- [[2026-10-10-ui-display-preferences-implementation]] - shared text-size, weight and contrast controls across farmer/admin pages; build and 121 frontend tests pass, rendered QA pending
- [[2026-10-10-toast-display-preferences-approach]] - recommended shared display preferences inherited by toasts, with enlarged-text and motion verification
- [[2026-10-10-sileo-toast-review]] - reviewed Sileo compatibility and proposed accessible toast scope; no implementation or install
- [[2026-10-10-ui-display-preferences-recommendations]] - proposed shared text-size, weight, and contrast preferences with local persistence; research only, implementation awaits approval
- [[2026-10-10-admin-registration-drawer]] - moved admin registration to a responsive right drawer with fixed header and draft protection; build and 106 frontend tests pass, browser QA remains open
- [[2026-10-10-merge-main-android-no-login]] - merged main (chat search, rails) into the no-login Android work; dropped ws sync, kept /search
- [[2026-10-10-android-app-setup-no-login]] - Android APK from the hub, first-run setup with success alert, no farmer login, Gemma needs WebGPU
- [[2026-10-10-setup-one-ai-progress]] - setup shows one "Ugatan AI" with a single download percent that never resets
- [[2026-10-10-chat-search-virtual]] - `/search` Dexie keyword search + scroll-to-match; TanStack Query/Virtual on results and chat thread
- [[2026-10-10-new-chat-highlight]] - New chat `bg-soft` only on draft; not when a UUID conversation is open
- [[2026-10-10-draft-chat-stays-empty]] - bare `/chat` no longer auto-selects last-active; New chat stays draft
- [[2026-10-10-defer-conversation-create]] - New chat / + stays on draft `/chat`; conversation created on first message only
- [[2026-10-10-delete-conversation-confirm-modal]] - sidebar Delete uses shared chat-history confirm dialog instead of window.confirm
- [[2026-10-10-resolve-main-merge-conflicts]] - resolved 4 conflicts merging main into implementing-guardrails; kept rails + answerOnPhone
- [[2026-10-10-prompt-leak-two-layer-rails]] - TL/EN extract blocked at input; model persona leaks hard-replaced with INJECTION_REPLY
- [[2026-10-10-prompt-injection-defense-map]] - mapped injection/leak rails: Tagalog "ulitin/instruksyon/blockquote" miss input rail; no output prompt-leak strip; Laya is matcher-only
- [[2026-10-10-other-crop-ask-guardrail]] - other-crop asks (maliban sa palay/mais) refuse before ASK canned reply
- [[2026-10-10-merge-offline-login-into-main]] - merged the offline/split-login branch into main; split login kept, deep links and logout dialog kept
- [[2026-10-10-logout-confirm-modal]] - farmer + admin Log out opens a confirm dialog before signing out
- [[2026-10-10-chat-conversation-urls]] - farmer chats use `/chat/:conversationId` deep links; bare `/chat` redirects to last active
- [[2026-10-10-branch-and-pr]] - pending work committed on `offline-farmer-login-photo-eval` and opened as a PR
- [[2026-10-10-photo-eval-and-confidence]] - 39-photo eval set and `pnpm eval:photo`; a photo alone is no longer "sure" on one sign (sure-and-wrong 18/31 to 2/31, healthy plants never told a sure problem)
- [[2026-10-10-gemma-laya-on-phone]] - Gemma (with photo reading) and Laya run on the phone; the hub serves both over Wi-Fi
- [[2026-10-10-local-only-offline]] - app reaches no internet: translated cards, chat without account, phone model from the hub, hub-only voice, local-only Laya
- [[2026-10-10-standalone-offline-assessment]] - research only: what a hub-free, under-200 MB web app would need and which parts conflict with team decisions
- [[2026-10-10-split-farmer-admin-login]] - separate farmer (/login) and staff (/admin/login) portals; farmer email/password needs a backend endpoint
- [[2026-10-09-admin-english-login-chat-fixes]] - translated admin UI to English, aligned the password icon field, removed login preview button, and wired home new-chat to its modal; 102 frontend tests pass
- [[2026-10-09-admin-frontend]] - built responsive Tagalog admin frontend without an age cutoff or dummy records; build/frontend checks pass, browser QA and hub model checks remain open
- [[2026-10-09-admin-ui-ux-scope]] - inspected admin Figma frames and proposed responsive pages/dialogs; frontend approval and backend integrations remain pending
- [[2026-10-09-chat-and-help-dialogs]] - responsive saved-chat dialog and concise Tulong; build and frontend tests pass, browser QA and hub model checks remain open
- [[2026-10-09-ugatan-help-tagalog]] - restored the local AI help modal, removed language selection, and added the Tagalog introduction and supplied icon
- [[2026-10-09-home-page-design-guide]] - added an implementation-facing guide for the current Ugatan Home Page UI/UX
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
