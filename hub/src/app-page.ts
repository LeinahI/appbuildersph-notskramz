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

function page(title: string, body: string, style = STYLE, script = ''): string {
  return `<!doctype html><html lang="fil"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${style}</style></head><body><main>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
}

export interface HubPageInfo {
  port: number;
  apkFile: string | null;
  phoneModel: boolean;
  phoneLaya: boolean;
}

/* The laptop screen is a facilitator dashboard: neutral page, white cards, one forest-green anchor. Plain CSS (the
   hub serves it with no build step and no internet, so no Tailwind CDN); the tokens mirror Tailwind's neutral scale. */
const HUB_STYLE = `
  :root { color-scheme: light; --leaf: #1f5c2e; --leaf-dark: #17441f; --sprout: #eef5e9; --n50: #fafafa; --n100: #f5f5f5; --n200: #e5e5e5;
          --n500: #737373; --n700: #404040; --n900: #171717; --amber: #92600a; --amber-bg: #fef6e0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--n50); color: var(--n900); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 1080px; margin: 0 auto; padding: 32px 20px 56px; }
  svg.i { width: 18px; height: 18px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 24px; margin-bottom: 28px; }
  h1 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 4px; }
  h2 { font-size: 1.05rem; margin: 0; }
  .muted { color: var(--n500); } header p { margin: 0; }
  .badge { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--n200); border-radius: 999px;
           padding: 6px 14px; font-size: .875rem; font-weight: 600; white-space: nowrap; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--leaf); flex: none; } .dot.off { background: #d49a1c; }
  .grid { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  @media (min-width: 900px) { .grid { grid-template-columns: minmax(0, 1fr) 380px; } }
  .stack { display: grid; gap: 20px; }
  .card { background: #fff; border: 1px solid var(--n200); border-radius: 16px; padding: 24px; }
  .card > h2 { margin-bottom: 16px; }
  .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  .steps li { display: flex; gap: 16px; align-items: flex-start; background: var(--n50); border-radius: 12px; padding: 14px 16px; }
  .num { width: 32px; height: 32px; border-radius: 50%; background: var(--leaf); color: #fff; font-weight: 700; display: grid; place-items: center; flex: none; }
  .steps small { display: block; color: var(--n500); font-weight: 600; font-size: .75rem; letter-spacing: .04em; text-transform: uppercase; }
  .steps p { margin: 0; line-height: 1.5; } .steps b { color: var(--leaf); }
  .rows { display: grid; }
  .row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-top: 1px solid var(--n100); }
  .row:first-child { border-top: 0; padding-top: 0; } .row:last-child { padding-bottom: 0; }
  .row .ico { width: 40px; height: 40px; border-radius: 10px; background: var(--sprout); color: var(--leaf); display: grid; place-items: center; flex: none; }
  .row .txt { flex: 1; min-width: 0; } .row .txt b { display: block; } .row .txt span { color: var(--n500); font-size: .875rem; }
  .pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 12px; font-size: .875rem; font-weight: 700; white-space: nowrap; }
  .pill.ok { background: var(--leaf); color: #fff; } .pill.warn { background: var(--amber-bg); color: var(--amber); }
  .state { display: inline-flex; align-items: center; gap: 8px; font-size: .9rem; font-weight: 600; white-space: nowrap; }
  .state.warn { color: var(--amber); }
  code { background: var(--n100); padding: 2px 6px; border-radius: 6px; font-size: .85em; word-break: break-all; }
  .hint { display: block; margin-top: 4px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; background: var(--leaf); color: #fff;
         font: inherit; font-size: .9rem; font-weight: 700; padding: 8px 14px; text-decoration: none; cursor: pointer; }
  .btn:hover { background: var(--leaf-dark); } .btn.off { background: var(--n200); color: var(--n500); pointer-events: none; }
  .link { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 4px 0; color: var(--leaf); font: inherit; font-size: .9rem; font-weight: 700; cursor: pointer; }
  .link:hover { text-decoration: underline; }
  .qrcard { text-align: center; }
  .qrcard .tag { display: inline-flex; align-items: center; gap: 8px; color: var(--leaf); font-weight: 700; margin-bottom: 4px; }
  .qrcard .cap { margin: 0 auto 16px; max-width: 28ch; color: var(--n700); line-height: 1.45; }
  .qr-code { display: block; margin: 0 auto; background: #fff; border: 1px solid var(--n200); border-radius: 12px; padding: 8px; width: 100%; max-width: 280px; height: auto; }
  .qrcard .url { margin: 16px 0 4px; } .qrcard .url code { font-size: .95rem; }
  .empty { text-align: left; background: var(--amber-bg); color: var(--amber); border-radius: 12px; padding: 14px 16px; font-weight: 600; }
`;

const icon = (paths: string) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const ICON = {
  qr: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  check: icon('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  alert: icon('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  copy: icon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  download: icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  phone: icon('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>'),
  eye: icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  match: icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
};

/** Copies on click. Plain http on a LAN is not a secure context, so navigator.clipboard may be missing: fall back. */
const COPY_SCRIPT = `
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var text = b.getAttribute('data-copy'), label = b.querySelector('span'), old = label.textContent;
    function done() { label.textContent = 'Nakopya na'; setTimeout(function () { label.textContent = old; }, 1800); }
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { if (document.execCommand('copy')) done(); } catch (_) {} t.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  });
`;

const STEPS: Array<[string, string]> = [
  ['Hakbang 1', 'Buksan ang <b>Mobile Hotspot</b> sa laptop.'],
  ['Hakbang 2', 'Ikonekta ang cellphone sa <b>Wi-Fi ng hotspot</b>.'],
  ['Hakbang 3', 'I-scan ang <b>QR code</b> para i-download ang Ugatan APK.'],
  ['Hakbang 4', 'Buksan ang app at hintaying matapos ang <b>awtomatikong AI sync</b>.'],
];

/** The laptop screen: how to join, one QR code for the hotspot, and what this hub can give the phones. */
export async function hubPage(info: HubPageInfo): Promise<string> {
  const addresses = lanAddresses();
  const size = apkSizeMb(info.apkFile);
  const hotspot = addresses.includes(HOTSPOT_ADDRESS);
  const primary = addresses[0];
  const urlOf = (address: string) => `http://${address}:${info.port}/app`;
  const qrOf = async (address: string) =>
    (await QRCode.toString(urlOf(address), { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })).replace('<svg', '<svg class="qr-code" role="img" aria-label="QR code"');
  const copyBtn = (address: string) => `<button type="button" class="link" data-copy="${escapeHtml(urlOf(address))}">${ICON.copy}<span>Kopyahin ang Link</span></button>`;

  const qrCard = primary
    ? `<div class="card qrcard">
<div class="tag">${ICON.qr}${hotspot ? 'Hotspot ng laptop' : 'Wi-Fi ng laptop'}</div>
<p class="cap">I-scan gamit ang cellphone habang nakakonekta sa Hotspot ng laptop</p>
${await qrOf(primary)}
<p class="url"><code>${escapeHtml(urlOf(primary))}</code></p>
${copyBtn(primary)}
</div>`
    : `<div class="card qrcard"><div class="empty">Walang Wi-Fi o hotspot na nakabukas sa laptop. Buksan ang Mobile Hotspot para lumabas ang QR code.</div></div>`;

  const ready = (on: boolean) =>
    on
      ? `<span class="state">${ICON.check}<span>Handa sa Hub</span></span>`
      : `<span class="state warn">${ICON.alert}<span>Wala sa Hub</span></span>`;
  const row = (ico: string, title: string, sub: string, end: string) =>
    `<div class="row"><div class="ico">${ico}</div><div class="txt"><b>${title}</b><span>${sub}</span></div>${end}</div>`;

  const apkRow = row(
    ICON.phone,
    'Ugatan Android App',
    size !== null ? `${size} MB` : `Wala pa: patakbuhin ang <code>pnpm --filter @ugatan/web android:apk</code>`,
    `<div style="display:grid;justify-items:end;gap:8px"><span class="pill ${size !== null ? 'ok' : 'warn'}">${size !== null ? 'Handa' : 'Wala pa'}</span>
<a class="btn${size !== null ? '' : ' off'}" href="${APK_PATH}" download="Ugatan.apk"${size !== null ? '' : ' aria-disabled="true"'}>${ICON.download}I-download ang APK</a></div>`,
  );

  return page(
    'Ugatan hub',
    `<header><div><h1>Ugatan hub</h1><p class="muted">I-setup ang cellphone ng magsasaka. Hindi kailangan ng internet.</p></div>
<span class="badge"><span class="dot"></span>Hub Status: Aktibo<span class="muted">|</span>Port ${info.port}</span></header>
<div class="grid"><div class="stack">
<section class="card"><h2>Mga hakbang</h2><ol class="steps">${STEPS.map(([label, text], i) => `<li><span class="num">${i + 1}</span><div><small>${label}</small><p>${text}</p></div></li>`).join('')}</ol></section>
<section class="card"><h2>Katayuan ng Hub</h2><div class="rows">
${apkRow}
${row(ICON.eye, 'Gemma Vision &amp; Chat Model', info.phoneModel ? 'Sagot at litrato' : 'Itakda ang <code>GEMMA_MODEL_DIR</code>', ready(info.phoneModel))}
${row(ICON.match, 'Laya Symptom Matching Model', info.phoneLaya ? 'Pantugma ng sintomas' : 'Itakda ang <code>LAYA_MODEL_DIR</code> at <code>LAYA_CONFIDENCE_THRESHOLD</code>', ready(info.phoneLaya))}
</div></section></div>
<aside class="aside">${qrCard}</aside></div>`,
    HUB_STYLE,
    COPY_SCRIPT,
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
