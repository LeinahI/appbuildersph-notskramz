# Brylim Langmalakas

Vault home. Each project folder is its own git repo.

## ugatan

Offline Taglish advisor for rice and corn farmers.

- [Project README](ugatan/README.md)
- [Business plan](ugatan/docs/BUSINESS-PLAN.md)
- [Disclosure: models, licenses, library versions](ugatan/docs/DISCLOSURE.md)

## appbuildersph-notskramz

- [Project structure](appbuildersph-notskramz/docs/project-structure.md)

## Agent notes

Written by agents after each task. See [AGENTS.md](AGENTS.md) for the format. Newest first.

- [[2026-10-10-stable-preferences-dialog]] - removed preference clutter and kept farmer/admin modal frames stable during text resizing; build and 134 frontend tests pass, browser QA remains open
- [[2026-10-10-sileo-toast-implementation]] - implemented preference-aware Sileo notifications across farmer/admin entries; 132 frontend tests pass, browser QA remains open
- [[2026-10-10-remove-registration-display-settings]] - removed preference controls from registration drawer; saved appearance still applies, build and 132 frontend tests pass
- [[2026-10-10-display-preferences-navigation]] - moved preferences to home sliders icon and aligned admin navigation; removed login/help shortcuts, 123 frontend tests pass
- [[2026-10-10-ui-display-preferences-implementation]] - shared text-size, weight and contrast controls across farmer/admin pages; build and 121 frontend tests pass, rendered QA pending

- [[2026-10-10-toast-display-preferences-approach]] - recommended shared display preferences inherited by toasts, with enlarged-text and motion verification
- [[2026-10-10-sileo-toast-review]] - reviewed Sileo compatibility and proposed accessible toast scope; no implementation or install
- [[2026-10-10-ui-display-preferences-recommendations]] - proposed shared text-size, weight, and contrast preferences with local persistence; research only, implementation awaits approval
- [[2026-10-10-admin-registration-drawer]] - moved admin registration to a responsive right drawer with fixed header and draft protection; build and 106 frontend tests pass, browser QA remains open
- [[2026-10-09-admin-english-login-chat-fixes]] - translated admin UI to English, aligned the password icon field, removed login preview button, and wired home new-chat to its modal; 102 frontend tests pass
- [[2026-10-09-admin-frontend]] - built responsive Tagalog admin frontend without an age cutoff or dummy records; build/frontend checks pass, browser QA and hub model checks remain open
- [[2026-10-09-admin-ui-ux-scope]] - inspected admin Figma frames and proposed responsive pages/dialogs; frontend approval and backend integrations remain pending
- [[2026-10-09-chat-and-help-dialogs]] - responsive saved-chat dialog and concise Tulong; build and frontend tests pass, browser QA and hub model checks remain open
- [[2026-10-09-ugatan-help-tagalog]] - restored the local AI help modal, removed language selection, and added the Tagalog introduction and supplied icon
- [[2026-10-09-home-page-design-guide]] - added an implementation-facing guide for the current Ugatan Home Page UI/UX
- [[2026-10-09-home-page-refinements]] - simplified the home UI, added logo and voice controls, and widened desktop chat; rendered QA remains open
- [[2026-10-09-home-page-browser-qa-blocked]] - local page served successfully, but responsive and keyboard QA remain blocked without a connected browser
- [[2026-10-09-ugatan-home-page-implementation]] - implemented the responsive, localized Figma Home frontend; browser comparison remains open
- [[2026-10-09-ugatan-home-page-plan]] - wrote the test-first frontend plan for the responsive, localized Figma Home
- [[2026-10-09-home-page-design]] - approved the responsive Figma Home design, three interface languages, and frontend-only scope
- [[2026-10-09-ui-stack-evaluation]] - keep the existing React PWA stack for the Figma UI; flag HTTPS-to-LAN-hub deployment constraints
- [[2026-10-09-ui-starting-map]] - mapped the existing React UI and the smallest safe starting point for implementation
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
