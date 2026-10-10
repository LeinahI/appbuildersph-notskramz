import { statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { KnowledgeEntry } from '@ugatan/shared';
import type { AudioTranscriber } from './explain/index.js';
import { parseTranscribeRequest, transcribeSpeech } from './transcribe.js';
import { APK_PATH, appPage, apkSizeMb, hubPage } from './app-page.js';
import { LAYA_PREFIX, LITERT_PATH, MODEL_PREFIX, byteRange, modelFile, sendModelFile } from './models.js';
import { answerQuestion, MAX_BODY_BYTES, MAX_IMAGE_BODY_BYTES, parseAskRequest, type AnswerDeps } from './answer.js';

export interface HubInfo {
  matcher: string;
  explainer: string;
  /** "on" when the hub reads photos. */
  vision: string;
  /** "on" when the hub transcribes speech. */
  voice: string;
  /** "on" when the hub serves the phone model's files (GEMMA_MODEL_DIR is set). */
  phoneModel: string;
  /** "on" when the hub serves Laya's bundle to phones (LAYA_MODEL_DIR and LAYA_CONFIDENCE_THRESHOLD are set). */
  phoneLaya?: string;
  /** "on" when the hub serves the Android app's native Gemma file (PHONE_LITERT_FILE). */
  phoneLitert?: string;
  /** The team's Laya confidence threshold, so the phone decides "sure" the same way. */
  layaThreshold?: number;
}

export interface HubDeps extends AnswerDeps {
  info: HubInfo;
  knowledge: readonly KnowledgeEntry[];
  /** Transcribes recordings. Without it, POST /transcribe answers "unavailable". */
  transcriber?: AudioTranscriber;
  /** Folder of the Gemma 4 ONNX model. When set, the hub serves its files to phones under /models/. */
  modelDir?: string | null;
  /** The Android app's native Gemma file (.litertlm). When set, the hub serves it at /models/litert/... */
  litertFile?: string | null;
  /** Laya's bundle folder. When set, the hub serves its files to phones under /models/laya/. */
  layaDir?: string | null;
  /** The Android app the hub hands out at /app/ugatan.apk, when it has been built. */
  apkFile?: string | null;
  /** The port the hub listens on, for the QR codes on its own page. */
  port?: number;
  /** Registration API. A finished APK download POSTs /api/v1/invites/downloaded here. */
  wsUrl?: string;
  /** Test hook for a finished APK download. Production uses wsUrl. */
  onApkDownloaded?: () => void;
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(html);
}

// The hub serves the LAN only. The phone app is often hosted on another origin, so CORS is open.
// No cookies and no credentials are used.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '600',
};

/** A full GET, or a range that starts at byte 0. Later range chunks and HEAD do not count. */
function apkDownloadCounts(req: IncomingMessage, file: string): boolean {
  if (req.method !== 'GET') return false;
  const raw = req.headers.range;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.trim()) return true;
  const range = byteRange(header, statSync(file).size);
  return !range || range.start === 0;
}

function notifyApkDownloaded(deps: HubDeps): void {
  deps.onApkDownloaded?.();
  const base = deps.wsUrl?.replace(/\/+$/, '');
  if (!base) return;
  // The file is already on the phone. A missed status update must not fail the download.
  void fetch(`${base}/api/v1/invites/downloaded`, { method: 'POST' }).catch(() => {});
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { ...CORS_HEADERS, 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

/**
 * Reads the whole body so the client finishes sending before it gets a reply. Oversized bodies are dropped, not stored.
 * The limit is the photo limit; a request without a photo is held to the smaller one by the caller.
 */
function readBody(req: IncomingMessage): Promise<{ body: string } | { tooLarge: true }> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_IMAGE_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => resolve(tooLarge ? { tooLarge: true } : { body: Buffer.concat(chunks).toString('utf8') }));
    req.on('error', reject);
  });
}

export function createHubServer(deps: HubDeps): Server {
  return createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://hub.local').pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method === 'GET' && path === '/health') {
      send(res, 200, { ok: true, ...deps.info, app: apkSizeMb(deps.apkFile ?? null) !== null ? 'on' : 'off' });
      return;
    }

    // Setting up a phone: the laptop shows `/` (QR code), the phone opens `/app` and downloads the APK.
    if (req.method === 'GET' && path === '/') {
      sendHtml(
        res,
        await hubPage({
          port: deps.port ?? 8787,
          apkFile: deps.apkFile ?? null,
          phoneModel: deps.info.phoneModel === 'on',
          phoneLaya: deps.info.phoneLaya === 'on',
        }),
      );
      return;
    }
    if (req.method === 'GET' && path === '/app') {
      sendHtml(res, appPage(deps.apkFile ?? null));
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && path === APK_PATH) {
      if (deps.apkFile && apkSizeMb(deps.apkFile) !== null) {
        const count = apkDownloadCounts(req, deps.apkFile);
        sendModelFile(req, res, deps.apkFile, {
          ...CORS_HEADERS,
          'content-type': 'application/vnd.android.package-archive',
          'content-disposition': 'attachment; filename="Ugatan.apk"',
        });
        if (count) {
          res.on('close', () => {
            if (res.writableFinished) notifyApkDownloaded(deps);
          });
        }
      } else {
        send(res, 404, { error: 'The app has not been built on this hub.' });
      }
      return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && path.startsWith(MODEL_PREFIX)) {
      const file = deps.modelDir ? modelFile(deps.modelDir, path) : null;
      if (file) sendModelFile(req, res, file, CORS_HEADERS);
      else send(res, 404, { error: 'Not found.' });
      return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && path === LITERT_PATH) {
      if (deps.litertFile && apkSizeMb(deps.litertFile) !== null) sendModelFile(req, res, deps.litertFile, CORS_HEADERS);
      else send(res, 404, { error: 'Not found.' });
      return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && path.startsWith(LAYA_PREFIX)) {
      const file = deps.layaDir ? modelFile(deps.layaDir, path, LAYA_PREFIX) : null;
      if (file) sendModelFile(req, res, file, CORS_HEADERS);
      else send(res, 404, { error: 'Not found.' });
      return;
    }

    if (req.method === 'POST' && path === '/ask') {
      let read: Awaited<ReturnType<typeof readBody>>;
      try {
        read = await readBody(req);
      } catch {
        send(res, 400, { error: 'Body could not be read.' });
        return;
      }
      if ('tooLarge' in read) {
        send(res, 413, { error: 'Body too large.' });
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(read.body);
      } catch {
        send(res, 400, { error: 'Body must be JSON.' });
        return;
      }
      // Only a photo may push a request past the small limit.
      const hasImage = typeof json === 'object' && json !== null && 'image' in json;
      if (!hasImage && Buffer.byteLength(read.body) > MAX_BODY_BYTES) {
        send(res, 413, { error: 'Body too large.' });
        return;
      }
      const parsed = parseAskRequest(json);
      if (typeof parsed === 'string') {
        send(res, 400, { error: parsed });
        return;
      }
      try {
        send(res, 200, await answerQuestion(parsed, deps));
      } catch {
        send(res, 500, { error: 'Hindi nasagot ang tanong. Subukan ulit.' });
      }
      return;
    }

    if (req.method === 'POST' && path === '/transcribe') {
      let read: Awaited<ReturnType<typeof readBody>>;
      try {
        read = await readBody(req);
      } catch {
        send(res, 400, { error: 'Body could not be read.' });
        return;
      }
      if ('tooLarge' in read) {
        send(res, 413, { error: 'Body too large.' });
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(read.body);
      } catch {
        send(res, 400, { error: 'Body must be JSON.' });
        return;
      }
      const parsed = parseTranscribeRequest(json);
      if (typeof parsed === 'string') {
        send(res, 400, { error: parsed });
        return;
      }
      send(res, 200, await transcribeSpeech(parsed.audio, deps));
      return;
    }

    send(res, 404, { error: 'Not found.' });
  });
}
