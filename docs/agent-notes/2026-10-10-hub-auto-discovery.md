# Phone finds the AI hub by itself

- Date: 2026-10-10
- Agent: Claude Opus 5.5
- Status: done

## Task
Make the app configure itself when the phone joins the hub's Wi-Fi, so its replies come from the AI hub (the same replies as on the laptop) and setup needs no taps. Follows [[2026-10-10-natural-ai-replies]].

## What changed
- [web/src/lib/hub-discovery.ts](../../web/src/lib/hub-discovery.ts) (new): `discoverHub` asks, all at once, the last hub used, the build's `VITE_HUB_URL`, the phone's Wi-Fi gateway (Android app), and the usual hotspot addresses (192.168.137.1 Windows, 192.168.43.1 Android, 172.20.10.1 iPhone, 10.0.2.2 emulator) on ports 8787 and 8790. It picks a hub whose `/health` says it has Gemma (`explainer` not off), else any hub. `ensureHub` keeps the saved hub while it answers with the AI, otherwise searches (a failed search is not repeated for 20 s) and saves what it finds.
- [web/src/config/hub.ts](../../web/src/config/hub.ts): the hub address is now the saved one (`ugatan.hubUrl`), else `VITE_HUB_URL`, else 127.0.0.1:8787. `HUB_PORTS`, `saveHubUrl`, `bakedHubUrl`.
- [web/src/lib/sync.ts](../../web/src/lib/sync.ts): `HubCapabilities.explainer`; `/health` must say `ok` and name a matcher, so a router page on the same address is not taken for a hub.
- [web/android/.../LocalLlmPlugin.java](../../web/android/app/src/main/java/ph/appbuilders/ugatan/LocalLlmPlugin.java): `network()` returns the active network's default gateway and the phone's IPv4 (ACCESS_NETWORK_STATE was already granted). Typed in [native-llm.ts](../../web/src/lib/native-llm.ts).
- [web/src/pages/SetupPage.tsx](../../web/src/pages/SetupPage.tsx): the connect step searches for the hub instead of polling one fixed address, and the AI download starts by itself once a hub is found and the phone can run the AI. A failed download still waits for a tap.
- [web/src/App.tsx](../../web/src/App.tsx): the hub address is state, found at start and on `online`, and checked again before each question, so a hub that moved (another hotspot or port) is found again.
- Test: [web/test/hub-discovery.test.ts](../../web/test/hub-discovery.test.ts).
- Rebuilt `web/android/app/build/outputs/apk/debug/app-debug.apk`.

## Decisions
- Prefer the hub with Gemma: the app now sends questions to the hub whenever one is in reach, so the hub it picks decides the replies. The 8787 hub also serves the phone model and the APK, so one hub covers setup and answers.
- The Wi-Fi gateway (native) plus the known hotspot addresses cover the designed setup (phone on the laptop's hotspot) without scanning a whole subnet.

## Verification
- `web`: tsc clean, 35 test files / 356 tests passed (6 new). `pnpm --filter @ugatan/web android:apk`: BUILD SUCCESSFUL; the dex has `getLinkProperties` and the bundle has the hotspot list.
- Laptop: hotspot address 192.168.137.1; `/health` answers there on 8787 (Gemma) and 8790 (no AI); the Windows firewall allows Node.js inbound on the Public profile.
- Browser app on localhost:3000: found the 8787 hub and answered "Paano po magtanim ng palay?" with the guide, no console errors.
- Not tested on a real phone: no device was connected to adb.

## Follow-ups
- A phone and laptop on the same router (not the laptop's hotspot) see the router as gateway, so the search misses the hub unless `VITE_HUB_URL` points at it. mDNS or a UDP broadcast from the hub would cover that.
- The separate 8790 hub (no AI) is no longer needed once phones use 8787.
