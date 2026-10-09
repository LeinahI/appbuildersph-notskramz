import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { KnowledgeEntry } from '@ugatan/shared';
import type { AudioTranscriber } from './explain/index.js';
import { parseTranscribeRequest, transcribeSpeech } from './transcribe.js';
import { LAYA_PREFIX, MODEL_PREFIX, modelFile, sendModelFile } from './models.js';
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
  /** Laya's bundle folder. When set, the hub serves its files to phones under /models/laya/. */
  layaDir?: string | null;
}

// The hub serves the LAN only. The phone app is often hosted on another origin, so CORS is open.
// No cookies and no credentials are used.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '600',
};

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
      send(res, 200, { ok: true, ...deps.info });
      return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && path.startsWith(MODEL_PREFIX)) {
      const file = deps.modelDir ? modelFile(deps.modelDir, path) : null;
      if (file) sendModelFile(req, res, file, CORS_HEADERS);
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
