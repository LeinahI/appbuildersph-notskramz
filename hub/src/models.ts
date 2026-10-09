import { createReadStream, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, extname, resolve, sep } from 'node:path';
import { PHONE_LAYA_PATH, PHONE_LITERT_PATH, PHONE_MODEL_REPO } from '@ugatan/shared';

/**
 * The hub hands the phone its model over the local Wi-Fi, so "Ihanda ang AI" needs no internet. The phone asks for
 * /models/<repo>/<file>, the layout Transformers.js uses for a mirror, and the files come from GEMMA_MODEL_DIR.
 */
export const MODEL_PREFIX = `/models/${PHONE_MODEL_REPO}/`;

/** The Android app's native model file (PHONE_LITERT_FILE). */
export const LITERT_PATH = `/models/${PHONE_LITERT_PATH}`;

/** Laya's bundle (LAYA_MODEL_DIR), for the phone's Laya worker. */
export const LAYA_PREFIX = `/models/${PHONE_LAYA_PATH}/`;

/**
 * The file in `dir` that a URL path under `prefix` asks for. Null when the path is not under the prefix, leaves the
 * folder, or is not a file.
 */
export function modelFile(dir: string, path: string, prefix = MODEL_PREFIX): string | null {
  if (!path.startsWith(prefix)) return null;
  let rest: string;
  try {
    rest = decodeURIComponent(path.slice(prefix.length));
  } catch {
    return null;
  }
  if (!rest || rest.includes('\0')) return null;
  const root = resolve(dir);
  const file = resolve(root, rest);
  if (!file.startsWith(root + sep)) return null;
  try {
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

/** The byte range a `Range: bytes=N-` (or `N-M`) header asks for, or null for the whole file or a range it cannot serve. */
export function byteRange(header: string | undefined, size: number): { start: number; end: number } | null {
  const m = header ? /^bytes=(\d+)-(\d*)$/.exec(header.trim()) : null;
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  return start < size && start <= end ? { start, end } : null;
}

/**
 * Sends one model file (or the APK, with its own headers). HEAD gets the headers only. A `Range` request gets the
 * rest of the file (206), so a phone that lost the Wi-Fi halfway through a 2.6 GB download picks up where it stopped.
 */
export function sendModelFile(req: IncomingMessage, res: ServerResponse, file: string, headers: Record<string, string>): void {
  const size = statSync(file).size;
  const range = byteRange(req.headers.range, size);
  res.writeHead(range ? 206 : 200, {
    'content-type': extname(file) === '.json' ? 'application/json; charset=utf-8' : 'application/octet-stream',
    'accept-ranges': 'bytes',
    ...headers,
    'content-length': String(range ? range.end - range.start + 1 : size),
    ...(range ? { 'content-range': `bytes ${range.start}-${range.end}/${size}` } : {}),
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = range ? createReadStream(file, { start: range.start, end: range.end }) : createReadStream(file);
  stream.on('error', () => res.destroy());
  // The laptop's console shows each phone download, so whoever runs the hub sees setup progress.
  const started = Date.now();
  res.on('close', () => {
    const mb = (size / 1e6).toFixed(1);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const who = req.socket.remoteAddress ?? 'phone';
    console.log(res.writableFinished ? `Sent ${basename(file)} (${mb} MB) to ${who} in ${secs} s` : `Stopped sending ${basename(file)} to ${who} after ${secs} s`);
  });
  stream.pipe(res);
}
