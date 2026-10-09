# Ugatan: Business Plan

Oct 9, 2026. Prepared for the team by @cedrix john.

## Executive summary

Ugatan is an offline advisor for Filipino rice and corn farmers. It helps them match what they see in the field to likely pests or diseases, then shows what to check and what to do next, in Taglish.

The core runs on any phone and works without mobile data. Full AI explanations run on a shared village hub or a small on-device model, so no farmer is locked out by their hardware.

The hackathon build is a working prototype. It uses a curated knowledge base of twenty rice and corn problems and an on-device language model. The next step is a pilot with a local agriculturist or farmer cooperative to test accuracy and adoption.

## Problem

- A farmer often has days, not weeks, to identify a pest or disease before it spreads.
- Getting a second opinion is slow when the agriculturist's office is far away.
- Many digital tools need a connection to diagnose a problem. They are least useful in the fields where signal is weakest.
- Most farm-advice tools are English-first. Farmers tend to describe problems in Tagalog or Taglish.

> **Open question:** how much yield do rice and corn farmers lose to pests and diseases each season? Find a sourced figure before the pilot.

## Solution and core functions

The farmer describes what they see in Tagalog, Taglish, or English. The app then works through five steps, all on the device.

1. **Match.** Keyword matching finds likely problems in a local knowledge base of rice and corn pests and diseases.
2. **Show signs.** Each match lists what to look for in the field.
3. **Suggest steps.** Each match lists practical field actions, such as scouting, handpicking, and residue removal.
4. **Escalate.** Each match states when to call an expert right away.
5. **Explain in Taglish.** An on-device language model rewrites the matched notes into a short answer. It can only use the matched notes.

**Guardrails:** the app never names pesticide brands or gives dosages. Every answer ends with a reminder to confirm with the local agriculturist, BPI, or PhilRice before spraying. When nothing matches, the app says so and points to the agriculturist.

Today it cannot identify a disease from a photo, track fields, or send weather alerts. Those are later stages.

## Tech stack

Ugatan is a static React web app. The model runs in the user's browser, so there is no backend to host, secure, or keep online. It runs in Chrome or Edge with WebGPU. A native app comes later. Packages for the web app and the hub are managed with pnpm.

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React, Vite, TypeScript | Fast builds, and no server to run |
| On-device AI | Transformers.js 4.3.0 | Chat, embeddings, speech, and vision in one library. WebGPU, with a WebAssembly fallback |
| Model | Gemma 4 E2B on the phone (built) and on the hub (built, GGUF through llama.cpp). Gemma 4 E4B is planned, not built | Transformers.js ONNX export from onnx-community for the phone. E2B suits weaker devices. A Taglish test still decides the default |
| Threading | Web Worker | Keeps the interface responsive during generation |
| Storage | IndexedDB, through Dexie | Chat history and documents stay on the device |
| Styling | Tailwind CSS | Quick to build a clean interface |
| Hosting | Netlify, Vercel, or GitHub Pages | Static hosting with nothing to fail on |
| Knowledge base | Curated TypeScript file with keyword matching | Works offline, and agronomists can review it directly |
| Mobile | PWA first, Capacitor later | Capacitor's WebView WebGPU support is unconfirmed (issue) |

**Rejected:** Laravel, Postgres, and Docker. They are server-side, which conflicts with the on-device rule, and Docker cannot use the Apple GPU on macOS. Next.js is also unnecessary without a server.

### Open checks before the pilot

- Confirm the text-only loading code from the Gemma 4 E4B model card works in the app.
- Measure load time and tokens per second on the pilot devices.
- Confirm E4B runs within the 6 GB GPU or shared memory that the reference app lists, on target laptops. Keep E2B as the fallback.
- Done in code: the prototype's phone model is Gemma 4 E2B (`web/src/config/models.ts`), not Qwen2.5-0.5B. Still to do: test it in Chrome on the demo laptop, and run 20 to 30 farmer descriptions through E2B and E4B to choose the default.

## Access model

Every farmer gets the offline advisor on their phone. The AI explanation reaches farmers through one of three paths, so hardware does not decide who gets help. No single phone runs the full model, so the plan does not promise that.

| Path | Who it serves | What it needs | Offline |
| --- | --- | --- | --- |
| Phone core | Any farmer | Any phone with a browser | Yes |
| Phone AI | Farmers whose phones can run a small model | Small model download, tested per device | Yes, after download |
| Village hub | Cooperative or barangay members | One capable laptop at the hub, shared over local Wi-Fi | Yes, on the local network |

The village hub is the main path for the AI explanation. It needs a build step: the hub runs Laya for matching and Gemma 4 E4B for the Taglish explanation, then serves answers to phones on the local network. Phone AI depends on tests of small models in Tagalog.

## Field connectivity

The offline core works everywhere, so connectivity only affects the AI explanation. The options, in the order the pilot should try them:

| Option | How it works | Needs | Use in the pilot |
| --- | --- | --- | --- |
| Queue and carry | The question is saved on the phone and sent when the phone reaches hub Wi-Fi | Hub Wi-Fi at the office or barangay hall | Default |
| Mobile hub | A field officer carries a laptop and power bank on visits | Officer, laptop, power bank | Backup for remote villages |
| Fixed Wi-Fi reach | Outdoor access points with directional antennas cover the fields | Site survey, power, maintenance | Only if farmers need real-time AI in the field |
| Hub hotspot | A hub device shares its connection locally | Hub device | Immediate area only |

## Farmer experience

1. **Install once.** The farmer opens a shared link and adds the app to the home screen. There is no account or login.
2. **Describe the problem.** The farmer picks the crop, then describes the problem or taps a symptom picture, and taps "Tingnan."
3. **Get steps at once.** Signs and field steps appear immediately, with no connection needed.
4. **Get the full explanation later.** For the Taglish explanation, the app queues the question and sends it when the phone reaches hub Wi-Fi. The answer then appears in the history.
5. **Use voice and pictures.** Voice input and symptom pictures help farmers with limited literacy and reduce typing.

### Build work for this flow

- Queue and sync in the app, so questions wait offline and send on reconnect.
- Hub answer service, which runs the model for queued questions on the local network.
- Symptom picture list, drawn from the knowledge base. The twenty current notes are not yet reviewed by an agronomist.
- Voice input tests in Tagalog on the pilot phones.

A connected fallback for farmers with signal and no capable device is possible later. It would send questions to a cloud model. It is not part of the offline core, and it is excluded from the hackathon build.

## Matching layer

Laya, an open-source decision model, is the matching layer on the village hub. Keyword matching runs on every phone and stays the offline fallback. Laya is not part of the hackathon build.

| Question | Keyword matching (phone) | Laya (hub) |
| --- | --- | --- |
| Which problem is this? | Keyword overlap, which misses wording it does not know | A probability for each known problem, with "not sure" when no option is clearly ahead |
| How urgent is it? | Fixed rule | A score on a fixed scale |
| Should the farmer call an expert now? | Fixed rule | A yes or no probability |

### Test plan

- Agronomist labels 50 to 100 farmer descriptions with the correct problem, including Taglish wording.
- Run keyword matching and Laya on the same set. Compare correct matches and the rate of "not sure" answers.
- Test the multilingual Laya variant on Tagalog and Taglish inputs.
- Set the confidence threshold below which the app says "not sure, call the agriculturist."

**Adoption rule:** Laya stays on the hub only if it beats keyword matching on the labeled set and fails safe on unclear descriptions. If it fails, the hub falls back to keyword matching. The pass mark is to be set before the test.

### Limits

- The weights are about 1.7 GB, and the model needs about 2 GB of RAM, so it cannot run on phones.
- It runs from Node.js 20 or newer. Browser use is not documented.
- The default checkpoint is English, and it was built for ticket routing, so it needs farm-specific labeled data.
- It scores problems but does not write the Taglish explanation, which still comes from the language model.

## Market

The Philippines has about 2.93 million rice farmers, the largest group Ugatan can serve on day one. Corn is sized by land area, not farmer count, because no current farmer count was found.

| Measure | Figure | As of | Source |
| --- | --- | --- | --- |
| Total rice farmers | 2.93 million | June 2026 | PhilRice Ricelytics |
| Rice area harvested | 4.7 million ha | MY 2025/26 forecast | USDA FAS Grain and Feed Annual |
| Corn area harvested | 2.48 million ha | MY 2025/26 forecast | USDA FAS Grain and Feed Annual |
| Corn farmers | Not found | | Open question |

- Farms are small. A 2018 factsheet put the average owned rice farm at 1.4 hectares, and the source argues the average has fallen since (Grant Thornton). Small farms with little technical support are the core users.
- An Oriental Mindoro profile citing PSA 2025 reports that 30.7% of farmers are poor (Orminagri). Price matters, so the product should stay free at the core.
- Not yet sized: the share of farmers who own a smartphone, and the share with usable signal in their fields. The pilot should measure both.

## Competition

Several Philippine tools overlap with Ugatan. None, in my review, combines offline on-device advice, rice and corn in one app, and Taglish explanations with no brand recommendations.

| Product | What it does | Offline | Gap for Ugatan |
| --- | --- | --- | --- |
| PhilRice Palai | Rice Q&A chatbot on Messenger, with expert-validated answers. PhilRice plans offline mobile apps in 2026. | No, Messenger-based | Government-backed, and the planned offline apps could compete directly |
| xarvio SCOUTING (BASF) | Free photo recognition for pests and diseases in rice, corn, potato, and tomato. Available in English, Tagalog, and Cebuano. Recommends BASF products. | Not stated | Product recommendations come from a seller, which creates a conflict of interest |
| AgRiDOC | Rice farm record-keeping and crop-stage guidance based on PalayCheck. About 500 registered users (2018 report). | Not stated | Record-keeping rather than problem diagnosis, and no corn coverage |
| Farmtri | Farm records, fertilizer schedules, crop monitoring, with Taglish testimonials. | Not stated | Planning and records rather than diagnosis |
| AgriConnect PH | Student project using field sensors and cloud AI for rice and corn alerts. Still in development. | No, cloud and sensors | Depends on hardware and a connection |

Adjacent reference: Digital Green's FarmerChat in India reports over 1 million downloads and answers in more than 15 languages. It is not Philippine-focused and is not offline.

> The review was based on public web pages. It did not test each product, and it did not check Plantix or the app stores directly.

## Business model

The core advisor stays free for farmers. Revenue comes from institutions that pay for localized knowledge and support, not from farmers or from brand sales. Pricing is not set yet.

1. **Local government and extension partnerships.** LGUs and agricultural offices pay for localized knowledge packs and training. PhilRice has said it plans a centralized system for LGUs to order knowledge products, which suggests a buyer exists (MEXC news summary).
2. **Cooperative licenses.** Farmer cooperatives pay a seat fee for members, plus onboarding and training.
3. **Premium features, later.** Photo diagnosis, weather-based alerts, and farm records could be paid add-ons, with the basic advisor kept free.
4. **Sponsorship, decided later.** Any sponsor must not be able to influence recommendations. Ugatan should avoid brand-linked advice, so the team needs a rule before accepting any sponsor.

## Go-to-market

The first market is a single pilot site, not the whole country. A local agriculturist or farmer cooperative in one municipality gives the team feedback, validates the knowledge base, and provides a credible reference.

- Identify one pilot partner: a municipal agriculture office or a farmer cooperative.
- Agree on the pilot scope: which crops, which problems, and how success is measured.
- Train two or three field helpers on how to demo and collect feedback.
- Run the pilot through one full crop cycle, logging matches, corrections, and escalations.

After the pilot, the channels to test are LGU and extension offices, cooperatives, and farmer community groups. Distribution should use sideloading or a web link, since the app needs no account.

## Team and roles

No owners are assigned yet. Each role below needs one named person before the pilot starts.

- **Product and pilot lead:** owns the pilot partner and feedback loop.
- **App engineering:** owns the React and on-device model stack.
- **Agronomy content:** owns and verifies the knowledge base with an agriculturist.
- **Partnerships and finance:** owns LGU and cooperative conversations and the budget.

## Financial assumptions

No amounts are set yet. The table lists what the plan has to cost, so the team can fill in real figures.

| Cost item | Basis | Amount |
| --- | --- | --- |
| Pilot field work | Days in the field, transport, helper stipends | To be set |
| Agronomist review | Hours of an agriculturist checking the knowledge base | To be set |
| Hosting and domain | Static hosting plus domain fees | To be set |
| Device testing | Laptops and phones that meet the WebGPU requirements | To be set |
| Content updates | Ongoing knowledge base maintenance | To be set |

Break-even depends on the pricing chosen in the business model section. Set a first target for the number of paying institutions before the pilot ends.

> **Open question:** how much will an LGU or cooperative pay for a knowledge pack or seat license?

## Risks and mitigations

- **Wrong advice.** A mismatch could lead to the wrong spray or no action. Mitigation: agronomist-verified notes, clear uncertainty when nothing matches, and a visible escalation path on every answer.
- **Device requirements.** Most farmers' phones cannot run the full model. Mitigation: the offline core runs on any phone, the AI runs on a village hub or a small on-device model, and the pilot records which path each farmer uses.
- **Model download.** The first load needs internet. Mitigation: pre-load the model before fieldwork, and distribute it through a shared device or a local hotspot.
- **Weather losses.** Typhoons reduce planting and harvest, which can cut demand. USDA's 2025/26 forecasts cite typhoon losses for both rice and corn. Mitigation: plan the pilot around the crop calendar.
- **Adoption.** Farmers may not trust an app over a person. Mitigation: involve local agriculturists and cooperatives early, and use their names in the pilot.
- **Partner dependence.** Pilot success depends on one or two institutions. Mitigation: pilot with at least two sites before scaling.
- **Competitor response.** PhilRice may launch offline apps. Mitigation: build partnerships and local content, and move quickly on corn coverage.

## Roadmap

Each phase ends at a gate. The team sets the gate criteria before starting the phase. Dates after the hackathon are not set.

| Phase | Milestone | Gate to next phase |
| --- | --- | --- |
| 0. Hackathon | Working prototype with twenty rice and corn problems and an on-device model. Demo on October 10, 2026, in Makati. | Demo delivered and judged |
| 1. Pilot prep | Pilot partner signed. Agronomist review of the knowledge base. Model chosen by a Taglish test: E2B by default if it passes, E4B on the hub. | Partner and reviewed content in place |
| 2. Field pilot | One full crop cycle at two sites, one with a village hub, with match and escalation logs. | Accuracy and adoption thresholds met, to be set |
| 3. Expand | Photo diagnosis, weather-based alerts, and broader corn coverage. | Paid pilot or LGU interest confirmed |
| 4. Scale | LGU and cooperative licenses, with localized knowledge packs. | Recurring revenue covers hosting and content costs |
