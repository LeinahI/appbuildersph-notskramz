import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DISCLAIMER, findViolations, type AskResponse, type KnowledgeEntry } from '@ugatan/shared';
import { createHubServer } from '../src/server';
import { createKeywordMatcher } from '../src/matchers/keyword';
import { offExplainer, type Explainer } from '../src/explain/index';
import { fileLogger, silentLogger } from '../src/log';
import { loadKnowledge } from '../src/knowledge';

const knowledge: KnowledgeEntry[] = loadKnowledge(new URL('../../knowledge/', import.meta.url));

let server: Server;
let base = '';
let logDir = '';

function startServer(explainer: Explainer, logger = silentLogger): Promise<void> {
  server = createHubServer({
    matcher: createKeywordMatcher(knowledge),
    explainer,
    knowledge,
    logger,
    info: { matcher: 'keyword', explainer: explainer.name, vision: 'off', voice: 'off', phoneModel: 'off' },
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

beforeAll(async () => {
  logDir = mkdtempSync(join(tmpdir(), 'ugatan-hub-'));
  await startServer(offExplainer, fileLogger(logDir));
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function ask(body: unknown): Promise<Response> {
  return fetch(`${base}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('hub HTTP', () => {
  it('answers /health with the active matcher and explainer', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, matcher: 'keyword', explainer: 'off', vision: 'off', voice: 'off', phoneModel: 'off', app: 'off' });
  });

  it('answers OPTIONS for CORS preflight', async () => {
    const res = await fetch(`${base}/ask`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('returns 404 for unknown routes', async () => {
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });

  it('rejects a body that is not JSON', async () => {
    expect((await ask('{not json')).status).toBe(400);
  });

  it.each([
    [{ crop: 'rice', text: 'x' }, 'uid'],
    [{ uid: 'a', crop: 'wheat', text: 'x' }, 'crop'],
    [{ uid: 'a', crop: 'rice', text: '   ' }, 'text'],
    [{ uid: 'a', crop: 'rice', text: 'x'.repeat(2001) }, 'text'],
  ])('rejects an invalid request (%#)', async (body, field) => {
    const res = await ask(body);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain(field);
  });

  it('rejects a body larger than 16 KB', async () => {
    const res = await ask({ uid: 'big', crop: 'rice', text: 'a'.repeat(20_000) });
    expect(res.status).toBe(413);
  });

  it('accepts a photo past 16 KB, and says this hub did not read it', async () => {
    // A JPEG header followed by filler, so the body is well past the small limit.
    const header = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
    const image = Buffer.concat([header, Buffer.alloc(60_000, 1)]).toString('base64');
    const res = await ask({ uid: 'photo-1', crop: 'any', text: 'May butas ang dahon ng mais', image });
    expect(res.status).toBe(200);
    expect(((await res.json()) as AskResponse).photo).toBe('unavailable');
  });

  it('rejects a body larger than the photo limit', async () => {
    const res = await ask({ uid: 'photo-2', crop: 'any', text: 'x', image: 'A'.repeat(1_500_000) });
    expect(res.status).toBe(413);
  });
});

describe('POST /ask', () => {
  it('matches each entry from its own keyword and returns the expected shape', async () => {
    for (const entry of knowledge) {
      const res = await ask({ uid: `t-${entry.id}`, crop: entry.crop, text: entry.keywords.join(' ') });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AskResponse;
      expect(body.uid).toBe(`t-${entry.id}`);
      expect(body.matcher).toBe('keyword');
      expect(body.matchIds).toContain(entry.id);
      expect(body.explanationStatus).toBe('unavailable');
      expect(body.explanation).toBeNull();
    }
  });

  it('reports no match when the description matches nothing', async () => {
    const body = (await (await ask({ uid: 'none-1', crop: 'rice', text: 'may problema ako hindi ko alam' })).json()) as AskResponse;
    expect(body.matchIds).toEqual([]);
    expect(body.clear).toBe(false);
  });
});

describe('explanation guardrail on the hub', () => {
  it('blocks an explanation that names a pesticide brand and never sends it', async () => {
    const unsafe: Explainer = {
      name: 'test-unsafe',
      async explain() {
        return { status: 'ok', text: 'Gamitin ang Karate, 2 ml kada litro.' };
      },
    };
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await startServer(unsafe);
    const body = (await (await ask({ uid: 'g-1', crop: 'rice', text: 'brown planthopper kumpol' })).json()) as AskResponse;
    expect(body.explanationStatus).toBe('blocked');
    expect(body.explanation).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/Karate|2 ml/);
  });

  it('passes a safe explanation through', async () => {
    const safe: Explainer = {
      name: 'test-safe',
      async explain() {
        return { status: 'ok', text: 'Tingnan ang base ng mga halaman para sa maliliit na insekto.' };
      },
    };
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await startServer(safe);
    const body = (await (await ask({ uid: 'g-2', crop: 'rice', text: 'brown planthopper kumpol' })).json()) as AskResponse;
    expect(body.explanationStatus).toBe('ok');
    expect(findViolations(body.explanation ?? '')).toEqual([]);
  });

  it('survives an explainer that throws, and answers with the matches only', async () => {
    const broken: Explainer = {
      name: 'test-broken',
      async explain() {
        throw new Error('model crashed');
      },
    };
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await startServer(broken);
    const res = await ask({ uid: 'g-3', crop: 'rice', text: 'brown planthopper kumpol' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AskResponse;
    expect(body.explanationStatus).toBe('unavailable');
    expect(body.matchIds).toContain('bph');
    expect(DISCLAIMER.length).toBeGreaterThan(0);
  });
});

describe('pilot log', () => {
  it('writes one JSON line per event with no personal fields', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ugatan-log-'));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await startServer(offExplainer, fileLogger(dir));
    await ask({ uid: 'log-1', crop: 'corn', text: 'fall armyworm sawdust sa mais' });

    const files = readdirSync(dir);
    expect(files.length).toBe(1);
    const lines = readFileSync(join(dir, files[0]), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const events = lines.map((l) => l.event);
    expect(events).toEqual(expect.arrayContaining(['question', 'match', 'explanation']));
    const allowed = new Set(['ts', 'event', 'uid', 'crop', 'text', 'route', 'matcher', 'ids', 'clear', 'reason', 'status', 'chars', 'where', 'message']);
    for (const line of lines) {
      for (const key of Object.keys(line)) expect(allowed.has(key), key).toBe(true);
    }
  });
});
