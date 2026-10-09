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

- [[2026-10-09-laya-webgpu-speed]] - Laya runs on the GPU with WebGPU (CPU fallback); about 0.1 s per question instead of 1 s, same eval results
- [[2026-10-09-gemma-llamacpp-speed]] - hub Gemma moved to llama.cpp on the GPU with shorter answers; 1 to 2.5 s per answer instead of 12 to 60 s
- [[2026-10-09-gemma-hub-explainer]] - local Gemma E2B now writes the hub explanation (CPU, q4f16); works but takes 12 to 60 s per answer
- [[2026-10-09-laya-option-text-fix]] - fixed Laya option truncation (40.7% to 63.0% correct, 0% wrong) and configured hub/.env
- [[2026-10-09-gemma-english-to-bicolano]] - Gemma English to Bicolano: not supported in the repo, quality untested
- [[2026-10-09-sync-local-model-paths]] - how to point each machine at its own Laya model folder
