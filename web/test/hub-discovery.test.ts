import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Android app's plugin: the phone is on a hotspot whose gateway is 192.168.50.1.
const native = vi.hoisted(() => ({ on: false, gateway: '192.168.50.1' as string | null }));
vi.mock('../src/lib/native-llm', () => ({
  get NATIVE_AI() {
    return native.on;
  },
  LocalLlm: { network: async () => ({ gateway: native.gateway, ip: '192.168.50.20' }) },
}));

import { loadHubUrl } from '../src/config/hub';
import { discoverHub, ensureHub, hubCandidates, resetHubSearch } from '../src/lib/hub-discovery';

/** The hubs that answer, by URL, with what their /health says. */
let hubs: Record<string, Record<string, unknown>> = {};
const fullHub = { ok: true, matcher: 'hybrid', explainer: 'gemma', phoneLitert: 'on' };
const phoneHub = { ok: true, matcher: 'keyword', explainer: 'off', phoneLitert: 'on' };

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('fetch', async (url: string) => {
    const base = url.replace(/\/health$/, '');
    const info = hubs[base];
    if (!info) throw new Error('unreachable');
    return { ok: true, json: async () => info } as Response;
  });
  hubs = {};
  native.on = false;
  native.gateway = '192.168.50.1';
  resetHubSearch();
});

afterEach(() => vi.unstubAllGlobals());

describe('finding the hub on the phone\'s Wi-Fi', () => {
  it('tries the Windows hotspot address on both hub ports', async () => {
    const urls = await hubCandidates();
    expect(urls).toContain('http://192.168.137.1:8787');
    expect(urls).toContain('http://192.168.137.1:8790');
  });

  it("tries the phone's own Wi-Fi gateway first in the Android app", async () => {
    native.on = true;
    const urls = await hubCandidates();
    const gateway = urls.indexOf('http://192.168.50.1:8787');
    expect(gateway).toBeGreaterThanOrEqual(0);
    expect(gateway).toBeLessThan(urls.indexOf('http://192.168.137.1:8787'));
  });

  it('picks the hub with the AI over the one that only serves the app and the model', async () => {
    hubs = { 'http://192.168.137.1:8790': phoneHub, 'http://192.168.137.1:8787': fullHub };
    expect((await discoverHub())?.url).toBe('http://192.168.137.1:8787');
  });

  it('finds a hub on another hotspot through the gateway, and remembers it', async () => {
    native.on = true;
    hubs = { 'http://192.168.50.1:8787': fullHub };
    const found = await ensureHub();
    expect(found?.url).toBe('http://192.168.50.1:8787');
    expect(found?.caps.explainer).toBe(true);
    expect(loadHubUrl()).toBe('http://192.168.50.1:8787');
  });

  it('is not fooled by a router page or other service on the same address', async () => {
    hubs = { 'http://192.168.137.1:8787': { status: 'fine' } };
    expect(await discoverHub()).toBeNull();
  });

  it('still uses a hub without the AI when it is the only one, and null away from any hub', async () => {
    hubs = { 'http://192.168.137.1:8790': phoneHub };
    expect((await ensureHub())?.url).toBe('http://192.168.137.1:8790');
    hubs = {};
    resetHubSearch();
    localStorage.setItem('ugatan.hubUrl', 'http://192.168.137.1:8790');
    expect(await ensureHub()).toBeNull();
  });
});
