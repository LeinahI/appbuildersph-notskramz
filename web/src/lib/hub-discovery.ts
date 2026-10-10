import { DEFAULT_HUB_URL, HUB_PORTS, bakedHubUrl, loadHubUrl, saveHubUrl } from '../config/hub';
import { LocalLlm, NATIVE_AI } from './native-llm';
import { hubCapabilities, type HubCapabilities } from './sync';

/**
 * Where a laptop hub usually is, seen from a phone on its Wi-Fi: Windows Mobile Hotspot, an Android phone's hotspot,
 * an iPhone's hotspot, and the Android emulator's host. The phone's own Wi-Fi gateway is tried first (native only).
 */
const HOTSPOT_GATEWAYS = ['192.168.137.1', '192.168.43.1', '172.20.10.1', '10.0.2.2'];

export interface FoundHub {
  url: string;
  caps: HubCapabilities;
}

/** The addresses to try, best guess first, without repeats. */
export async function hubCandidates(): Promise<string[]> {
  const urls: string[] = [];
  const add = (url: string | null | undefined) => {
    const clean = (url ?? '').trim().replace(/\/+$/, '');
    if (clean && !urls.includes(clean)) urls.push(clean);
  };
  add(loadHubUrl());
  add(bakedHubUrl());
  if (NATIVE_AI) {
    try {
      const { gateway } = await LocalLlm.network();
      if (gateway) for (const port of HUB_PORTS) add(`http://${gateway}:${port}`);
    } catch {
      // An older app build without network(): the hotspot addresses below still cover the usual setups.
    }
  }
  for (const host of HOTSPOT_GATEWAYS) for (const port of HUB_PORTS) add(`http://${host}:${port}`);
  // In a browser opened from the hub itself (the hub's app page), the hub is the page's own origin.
  if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && HUB_PORTS.includes(Number(location.port))) add(location.origin);
  add(DEFAULT_HUB_URL);
  return urls;
}

/**
 * Asks every candidate at once and picks a hub: one that answers with the AI (Gemma) first, so questions sent to it
 * get the same replies as on the laptop; among equals, the earlier candidate (the one used last time). Null when no
 * hub answers, such as away from its Wi-Fi.
 */
export async function discoverHub(): Promise<FoundHub | null> {
  const urls = await hubCandidates();
  const found = await Promise.all(urls.map(async (url) => ({ url, caps: await hubCapabilities(url) })));
  const hubs = found.filter((h): h is FoundHub => h.caps !== null);
  if (hubs.length === 0) return null;
  return hubs.find((h) => h.caps.explainer) ?? hubs[0]!;
}

let lastScan: { at: number; hub: FoundHub | null } | null = null;
/** A failed search is not repeated for this long, so a farmer away from the hub does not wait on every question. */
const RESCAN_MS = 20_000;

/**
 * The hub to use now, configured with no taps: the saved hub when it still answers with the AI, otherwise a fresh
 * search, which is saved for next time. Null when no hub is in reach.
 */
export async function ensureHub(): Promise<FoundHub | null> {
  const saved = loadHubUrl();
  const caps = await hubCapabilities(saved);
  if (caps?.explainer) return { url: saved, caps };
  if (lastScan && Date.now() - lastScan.at < RESCAN_MS && !caps) return lastScan.hub;
  const hub = await discoverHub();
  lastScan = { at: Date.now(), hub };
  if (hub) {
    saveHubUrl(hub.url);
    return hub;
  }
  return caps ? { url: saved, caps } : null;
}

/** For tests: forget the last search. */
export function resetHubSearch(): void {
  lastScan = null;
}
