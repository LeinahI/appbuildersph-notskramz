import { mkdtempSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { offExplainer } from '../src/explain/index';
import { silentLogger } from '../src/log';
import { createKeywordMatcher } from '../src/matchers/keyword';
import { APK_PATH, lanAddresses } from '../src/app-page';
import { createHubServer } from '../src/server';

const apk = join(mkdtempSync(join(tmpdir(), 'ugatan-apk-')), 'app-debug.apk');
writeFileSync(apk, Buffer.alloc(2_000_000, 1));

async function waitFor(pred: () => boolean): Promise<void> {
  for (let i = 0; i < 20 && !pred(); i++) await new Promise((r) => setTimeout(r, 10));
}

function start(apkFile: string | null): Promise<{ server: Server; base: string }> {
  const server = createHubServer({
    matcher: createKeywordMatcher([]),
    explainer: offExplainer,
    knowledge: [],
    logger: silentLogger,
    apkFile,
    port: 8787,
    info: { matcher: 'keyword', explainer: 'off', vision: 'off', voice: 'off', phoneModel: 'on', phoneLaya: 'off' },
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }));
  });
}

describe('setting up a phone from the hub', () => {
  let withApp: { server: Server; base: string };
  let without: { server: Server; base: string };
  beforeAll(async () => {
    withApp = await start(apk);
    without = await start(join(tmpdir(), 'no-such-ugatan.apk'));
  });
  afterAll(async () => {
    for (const s of [withApp, without]) await new Promise<void>((r) => s.server.close(() => r()));
  });

  it('shows the laptop page with the steps, a QR code per address, and what the hub has', async () => {
    const res = await fetch(`${withApp.base}/`);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Mobile Hotspot');
    expect(html).toContain('Hakbang 4');
    expect(html).toContain('Port 8787');
    expect(html).toContain('2 MB');
    expect(html).toContain(`href="${APK_PATH}"`);
    // Gemma is on, Laya is off.
    expect(html).toContain('Handa sa Hub');
    expect(html).toContain('Wala sa Hub');
    // One QR code only: the other addresses are not offered.
    expect((html.match(/class="qr-code"/g) ?? []).length).toBe(lanAddresses().length ? 1 : 0);
    expect(html).not.toContain('Ibang IP');
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    // The page loads nothing from the internet.
    expect(html).not.toMatch(/https:\/\//);
  });

  it('gives the phone a download page and the APK', async () => {
    const page = await (await fetch(`${withApp.base}/app`)).text();
    expect(page).toContain(`href="${APK_PATH}"`);
    const res = await fetch(`${withApp.base}${APK_PATH}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/vnd.android.package-archive');
    expect(res.headers.get('content-disposition')).toContain('Ugatan.apk');
    expect((await res.arrayBuffer()).byteLength).toBe(2_000_000);
    expect((await (await fetch(`${withApp.base}/health`)).json()).app).toBe('on');
  });

  it('says so when the app has not been built', async () => {
    expect(await (await fetch(`${without.base}/app`)).text()).toContain('Wala pang app');
    expect((await fetch(`${without.base}${APK_PATH}`)).status).toBe(404);
    expect((await (await fetch(`${without.base}/health`)).json()).app).toBe('off');
  });

  it('notifies when an APK download finishes, not on HEAD or a later range', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'ugatan-apk-notify-')), 'app-debug.apk');
    writeFileSync(file, Buffer.alloc(64, 1));
    let n = 0;
    const server = createHubServer({
      matcher: createKeywordMatcher([]),
      explainer: offExplainer,
      knowledge: [],
      logger: silentLogger,
      apkFile: file,
      onApkDownloaded: () => {
        n += 1;
      },
      info: { matcher: 'keyword', explainer: 'off', vision: 'off', voice: 'off', phoneModel: 'off' },
    });
    const base = await new Promise<string>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
    });
    try {
      expect((await fetch(`${base}${APK_PATH}`, { method: 'HEAD' })).status).toBe(200);
      expect(n).toBe(0);
      expect((await fetch(`${base}${APK_PATH}`, { headers: { Range: 'bytes=10-20' } })).status).toBe(206);
      expect(n).toBe(0);
      const res = await fetch(`${base}${APK_PATH}`);
      await res.arrayBuffer();
      await waitFor(() => n === 1);
      expect(n).toBe(1);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it('lists the laptop hotspot address first and never loopback or link-local', () => {
    const addresses = lanAddresses();
    expect(addresses.every((a) => !a.startsWith('127.') && !a.startsWith('169.254.'))).toBe(true);
    if (addresses.includes('192.168.137.1')) expect(addresses[0]).toBe('192.168.137.1');
  });
});
