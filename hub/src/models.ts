import { createReadStream, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { PHONE_LAYA_PATH, PHONE_MODEL_REPO } from '@ugatan/shared';

/**
 * The hub hands the phone its model over the local Wi-Fi, so "Ihanda ang AI" needs no internet. The phone asks for
 * /models/<repo>/<file>, the layout Transformers.js uses for a mirror, and the files come from GEMMA_MODEL_DIR.
 */
export const MODEL_PREFIX = `/models/${PHONE_MODEL_REPO}/`;

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

/** Sends one model file. HEAD gets the headers only. */
export function sendModelFile(req: IncomingMessage, res: ServerResponse, file: string, headers: Record<string, string>): void {
  const size = statSync(file).size;
  res.writeHead(200, {
    ...headers,
    'content-type': extname(file) === '.json' ? 'application/json; charset=utf-8' : 'application/octet-stream',
    'content-length': String(size),
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}
