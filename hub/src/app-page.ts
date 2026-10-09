import { existsSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import QRCode from 'qrcode';

/**
 * Setting up a phone, from the hub (the laptop). The laptop screen shows `/` with a QR code; the farmer joins the
 * laptop's Wi-Fi hotspot, scans it, and gets `/app`, which downloads the Android app from `/app/ugatan.apk`. The app
 * then downloads its AI from this hub (its own setup screen). No internet anywhere.
 */

/** Where the hub serves the APK. */
export const APK_PATH = '/app/ugatan.apk';

/** Windows Mobile Hotspot always gives the laptop this address, so it is listed first. */
const HOTSPOT_ADDRESS = '192.168.137.1';

/** The laptop's addresses a phone on its Wi-Fi can reach: IPv4, not loopback, not link-local. */
export function lanAddresses(): string[] {
  const found: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) found.push(a.address);
    }
  }
  return [...new Set(found)].sort((a, b) => Number(b === HOTSPOT_ADDRESS) - Number(a === HOTSPOT_ADDRESS));
}

/** The APK's size in MB, or null when it has not been built (pnpm --filter @ugatan/web android:apk). */
export function apkSizeMb(apkFile: string | null): number | null {
  if (!apkFile || !existsSync(apkFile)) return null;
  return Math.round(statSync(apkFile).size / 1e6);
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLE = `
  :root { color-scheme: light; --ink: #17301f; --mist: #5b6b60; --leaf: #1f5c2e; --sprout: #eef5e9; --line: #d5e2cf; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f9f3; color: var(--ink); font: 17px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 1.7rem; margin: 0 0 4px; } h2 { font-size: 1.15rem; margin: 0 0 8px; }
  .muted { color: var(--mist); } .card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 18px; margin-top: 16px; }
  ol { margin: 0; padding-left: 1.3em; } li { margin: 6px 0; }
  .qr { display: flex; flex-wrap: wrap; gap: 16px; } .qr figure { margin: 0; text-align: center; }
  .qr svg { width: 220px; height: 220px; background: #fff; border-radius: 12px; }
  code { background: var(--sprout); padding: 2px 6px; border-radius: 6px; }
  .btn { display: block; text-align: center; background: var(--leaf); color: #fff; text-decoration: none; font-weight: 700;
         padding: 16px; border-radius: 14px; font-size: 1.15rem; }
  .ok { color: var(--leaf); font-weight: 600; } .warn { color: #8a5a00; font-weight: 600; }
`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="fil"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;
}

export interface HubPageInfo {
  port: number;
  apkFile: string | null;
  phoneModel: boolean;
  phoneLaya: boolean;
}

/** The laptop screen: how to join, a QR code per address, and what this hub can give the phones. */
export async function hubPage(info: HubPageInfo): Promise<string> {
  const addresses = lanAddresses();
  const size = apkSizeMb(info.apkFile);
  const qrs = await Promise.all(
    addresses.map(async (address) => {
      const url = `http://${address}:${info.port}/app`;
      const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
      return `<figure>${svg}<figcaption><code>${escapeHtml(url)}</code>${address === HOTSPOT_ADDRESS ? '<br><span class="muted">Mobile Hotspot</span>' : ''}</figcaption></figure>`;
    }),
  );
  const status = (on: boolean, yes: string, no: string) => (on ? `<span class="ok">${yes}</span>` : `<span class="warn">${no}</span>`);
  return page(
    'Ugatan hub',
    `<h1>Ugatan hub</h1><p class="muted">I-setup ang cellphone ng magsasaka. Hindi kailangan ng internet.</p>
<div class="card"><h2>Mga hakbang</h2><ol>
<li>Buksan ang <b>Mobile Hotspot</b> ng laptop na ito (Settings › Network &amp; internet › Mobile hotspot).</li>
<li>Sa cellphone, kumonekta sa Wi-Fi ng hotspot na iyon.</li>
<li>I-scan ang QR sa ibaba gamit ang camera ng cellphone, at i-download ang Ugatan app.</li>
<li>Buksan ang app. Sa <b>Pag-setup</b>, ida-download nito ang AI mula sa hub na ito, at may lalabas na "Tapos na".</li>
</ol></div>
<div class="card"><h2>I-scan para i-download ang app</h2>
${qrs.length ? `<div class="qr">${qrs.join('')}</div>` : '<p class="warn">Walang Wi-Fi o hotspot na nakabukas sa laptop.</p>'}</div>
<div class="card"><h2>Nasa hub na ito</h2><ul>
<li>Android app: ${status(size !== null, `handa (${size} MB)`, 'wala pa: patakbuhin ang <code>pnpm --filter @ugatan/web android:apk</code>')}</li>
<li>Gemma (sagot at litrato): ${status(info.phoneModel, 'handa', 'wala: itakda ang GEMMA_MODEL_DIR')}</li>
<li>Laya (pantugma): ${status(info.phoneLaya, 'handa', 'wala: itakda ang LAYA_MODEL_DIR at LAYA_CONFIDENCE_THRESHOLD')}</li>
</ul></div>`,
  );
}

/** The phone's download page, opened from the QR code. */
export function appPage(apkFile: string | null): string {
  const size = apkSizeMb(apkFile);
  return page(
    'I-download ang Ugatan',
    `<h1>Ugatan</h1><p class="muted">Payo sa palay at mais, kahit walang signal.</p>
${
  size !== null
    ? `<div class="card"><a class="btn" href="${APK_PATH}" download="Ugatan.apk">I-download ang app (${size} MB)</a></div>`
    : '<div class="card"><p class="warn">Wala pang app sa hub na ito. Sabihan ang namamahala ng hub.</p></div>'
}
<div class="card"><h2>Pagkatapos i-download</h2><ol>
<li>Buksan ang na-download na <b>Ugatan.apk</b>.</li>
<li>Kung itanong, payagan ang pag-install mula sa browser na ito ("Install unknown apps").</li>
<li>I-install at buksan ang Ugatan.</li>
<li>Manatiling nakakonekta sa Wi-Fi na ito habang nagse-setup ang app.</li>
</ol></div>`,
  );
}
