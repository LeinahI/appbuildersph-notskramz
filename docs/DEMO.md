# Demo runbook

The offline demo for the AppBuildersPH Hackathon, on the demo laptop, in Chrome. The phone is the laptop. Keep the demo on the phone path only: keyword matching in the browser, and Gemma 4 E2B in the browser for the explanation. Do not start the hub during the demo.

Timings follow the briefing's suggested script: about 2 minutes 40 seconds. The organizers have not confirmed the time limit (see the questions in the README).

Status key: **[checked]** has been verified in code or by a build or test. **[not yet run]** still needs a run on the demo laptop.

## Before the demo (online, one time)

1. Install and build: `pnpm install`, then `pnpm build` from the repo root. [checked: build passes]
2. Serve the built site: `pnpm --filter @ugatan/web preview`. It runs on http://localhost:3000 and stops if that port is taken. [checked: strictPort in `web/vite.config.ts`]
3. Open http://localhost:3000 in Chrome. Check that WebGPU is available (`chrome://gpu`, or `navigator.gpu` in the console). [not yet run]
4. Tap **Ihanda ang AI** and wait until the status says ready. The first download is about 3.1 GB from Hugging Face. Check that the device line says GPU (WebGPU). [not yet run]
5. Ask the demo question once, online, and confirm the Taglish explanation appears under the notes. [not yet run]
6. In DevTools, open Application, then Service Workers, and confirm the app's service worker is active. Reload once. [not yet run]
7. Make sure the hub is not running. If it is, stop it, or start it with `HUB_MATCHER=keyword`. The hub's Laya matcher must not reach the screen. [checked: the app shows the hub's match once a hub answers]

## Offline run (network off)

8. Turn Wi-Fi and any tether off. Hard reload the page (Ctrl+Shift+R). The app shell should load from the service worker. [not yet run]
9. Tap **Ihanda ang AI** again if the status shows idle. The model should load from the browser cache with no network. [not yet run. This is the riskiest step. If it fails, use the backup video.]
10. Ask the demo question. The notes and the Taglish explanation should both appear. [not yet run]

**Demo question** (built from keywords in `knowledge/stem-borer.json`: "madaling hilahin", "gitnang dahon", "walang laman"):

> Madaling hilahin ang gitnang dahon ng palay, at puti at walang laman ang uhay.

Run this exact question once before the demo to confirm the match.

## Script

| Segment | Time | What to show | What to say |
| --- | --- | --- | --- |
| Problem | 20 s | The laptop, with no signal. | A farmer in the field with no signal needs to know what is eating the leaves. |
| Offline match | 40 s | Network off. Type the question. Show the matched signs and the field steps. | The notes are on the device. Keyword matching runs with no network. |
| Local AI | 60 s | The "AI" section, with the Taglish explanation. Open DevTools, Network tab, and show that no request is sent while the question is answered. | The explanation comes from a Gemma 4 E2B model running in this browser. Nothing leaves the laptop. |
| Safety | 20 s | Show the "Kumonsulta agad kung" line, the disclaimer at the bottom (it says to confirm with the local agriculturist), and a vague question that gives the not-sure or no-match text. | The app never names a pesticide or gives a dose. It says when to call the agriculturist. If it is not sure, it says so. |
| Plan | 20 s | Keep to the business plan's village hub and pilot. | A village hub on the cooperative's Wi-Fi, and a pilot with one partner. |

What the screen shows, checked in the browser on the dev server (keyword path, AI not prepared):

- The demo question matches **Stem borer**, and the page shows its signs, steps, the "Kumonsulta agad kung" line, and the disclaimer. [checked]
- The notes are in English, with Tagalog and Cebuano keywords for matching. The Taglish explanation comes from Gemma, so it appears only after **Ihanda ang AI** (step 4) is ready.
- If the AI is not ready, the page says the explanation waits for the hub. It is not an error, but it is not the Local AI segment either.

**Say this on stage** (the knowledge base limit, required by the briefing):

> Ang knowledge base namin ay walong tala lang, at hindi pa ito nire-review ng agronomist. Iyon ang susunod naming gagawin.

English: "Our knowledge base is twenty notes, sixteen of them insects with their English, scientific, and Filipino names, and an agronomist has not reviewed them yet. That is our next step."

## Do not show

- **Laya** (the hub's matcher). It is not part of the core demo, per the briefing.
- **The hub** and any hub-side explanation. Keep the hub off.
- **Voice input.** In Chrome, speech recognition uses a network service (the app's own hint says so), so it breaks the offline claim.
- **Settings** that point at a hub address.

## Backup video

Record the offline run on the demo laptop before the deadline, with the network off. Keep it under three minutes. Show the model running on the device, and the DevTools Network tab with no requests during the answer. [not yet recorded]

## Known risks

- **Offline model load is not yet tested.** The onnxruntime files now go through a CacheFirst service-worker rule after the first online load (`web/vite.config.ts`). The model weights are cached by Transformers.js. Whether a network-off reload finds all of them is unverified. [not yet run]
- **WebGPU** varies by browser and driver. If the device line says CPU, the answer is slower. Test it on the demo laptop.
- **Browser storage.** A cleared site-data cache removes the model. Do not clear site data before the demo.
