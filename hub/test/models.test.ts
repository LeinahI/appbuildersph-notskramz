import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PHONE_LAYA_PATH, PHONE_MODEL_REPO } from '@ugatan/shared';
import { offExplainer } from '../src/explain/index';
import { silentLogger } from '../src/log';
import { createKeywordMatcher } from '../src/matchers/keyword';
import { LAYA_PREFIX, LITERT_PATH, MODEL_PREFIX, byteRange, modelFile } from '../src/models';
import { createHubServer } from '../src/server';

const dir = mkdtempSync(join(tmpdir(), 'ugatan-model-'));
mkdirSync(join(dir, 'onnx'));
writeFileSync(join(dir, 'config.json'), '{"model_type":"gemma4"}');
writeFileSync(join(dir, 'onnx', 'embed_tokens_q4f16.onnx'), Buffer.from([1, 2, 3, 4]));

let server: Server;
let base = '';

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = createHubServer({
        matcher: createKeywordMatcher([]),
        explainer: offExplainer,
        knowledge: [],
        logger: silentLogger,
        modelDir: dir,
        info: { matcher: 'keyword', explainer: 'off', vision: 'off', voice: 'off', phoneModel: 'on' },
      });
      server.listen(0, '127.0.0.1', () => {
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        resolve();
      });
    }),
);

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('phone model files from the hub', () => {
  it('uses the mirror layout Transformers.js asks for', () => {
    expect(MODEL_PREFIX).toBe(`/models/${PHONE_MODEL_REPO}/`);
  });

  it('serves a config file and a weights file from the model folder, with CORS', async () => {
    const config = await fetch(`${base}${MODEL_PREFIX}config.json`);
    expect(config.status).toBe(200);
    expect(config.headers.get('access-control-allow-origin')).toBe('*');
    expect(await config.json()).toEqual({ model_type: 'gemma4' });

    const weights = await fetch(`${base}${MODEL_PREFIX}onnx/embed_tokens_q4f16.onnx`);
    expect(weights.status).toBe(200);
    expect(weights.headers.get('content-length')).toBe('4');
    expect([...new Uint8Array(await weights.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });

  it('answers HEAD with the size and no body', async () => {
    const res = await fetch(`${base}${MODEL_PREFIX}config.json`, { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe('23');
  });

  it('gives 404 for a missing file, a folder, or another repo', async () => {
    expect((await fetch(`${base}${MODEL_PREFIX}missing.json`)).status).toBe(404);
    expect((await fetch(`${base}${MODEL_PREFIX}onnx`)).status).toBe(404);
    expect((await fetch(`${base}/models/someone/else/config.json`)).status).toBe(404);
  });

  it('never leaves the model folder', () => {
    expect(modelFile(dir, `${MODEL_PREFIX}../../etc/passwd`)).toBeNull();
    expect(modelFile(dir, `${MODEL_PREFIX}..%2F..%2Fsecret`)).toBeNull();
    expect(modelFile(dir, `${MODEL_PREFIX}%00config.json`)).toBeNull();
    expect(modelFile(dir, `${MODEL_PREFIX}config.json`)).toBe(join(dir, 'config.json'));
  });
});

describe('Laya bundle from the hub', () => {
  const layaDir = mkdtempSync(join(tmpdir(), 'ugatan-laya-'));
  mkdirSync(join(layaDir, 'tokenizer'));
  writeFileSync(join(layaDir, 'laya_config.json'), '{"max_len":192}');
  writeFileSync(join(layaDir, 'tokenizer', 'tokenizer.json'), '{}');
  let layaServer: Server;
  let layaBase = '';

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        layaServer = createHubServer({
          matcher: createKeywordMatcher([]),
          explainer: offExplainer,
          knowledge: [],
          logger: silentLogger,
          layaDir,
          info: { matcher: 'keyword', explainer: 'off', vision: 'off', voice: 'off', phoneModel: 'off', phoneLaya: 'on', layaThreshold: 0.3 },
        });
        layaServer.listen(0, '127.0.0.1', () => {
          layaBase = `http://127.0.0.1:${(layaServer.address() as AddressInfo).port}`;
          resolve();
        });
      }),
  );

  afterAll(() => new Promise<void>((resolve) => layaServer.close(() => resolve())));

  it('serves the config and the tokenizer under /models/laya/', async () => {
    expect(LAYA_PREFIX).toBe(`/models/${PHONE_LAYA_PATH}/`);
    expect(await (await fetch(`${layaBase}${LAYA_PREFIX}laya_config.json`)).json()).toEqual({ max_len: 192 });
    expect((await fetch(`${layaBase}${LAYA_PREFIX}tokenizer/tokenizer.json`)).status).toBe(200);
  });

  it('says in /health that it serves Laya, with the team threshold', async () => {
    const info = await (await fetch(`${layaBase}/health`)).json();
    expect(info.phoneLaya).toBe('on');
    expect(info.layaThreshold).toBe(0.3);
  });

  it('serves no Gemma files when GEMMA_MODEL_DIR is not set', async () => {
    expect((await fetch(`${layaBase}${MODEL_PREFIX}config.json`)).status).toBe(404);
  });
});

describe('resuming a big download and the native model file', () => {
  const dir2 = mkdtempSync(join(tmpdir(), 'ugatan-litert-'));
  const litert = join(dir2, 'gemma-4-E2B-it.litertlm');
  writeFileSync(litert, Buffer.from(Array.from({ length: 100 }, (_, i) => i)));
  let s: Server;
  let b = '';

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        s = createHubServer({
          matcher: createKeywordMatcher([]),
          explainer: offExplainer,
          knowledge: [],
          logger: silentLogger,
          litertFile: litert,
          info: { matcher: 'keyword', explainer: 'off', vision: 'off', voice: 'off', phoneModel: 'off', phoneLitert: 'on' },
        });
        s.listen(0, '127.0.0.1', () => {
          b = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
          resolve();
        });
      }),
  );
  afterAll(() => new Promise<void>((resolve) => s.close(() => resolve())));

  it('reads a byte range header', () => {
    expect(byteRange('bytes=40-', 100)).toEqual({ start: 40, end: 99 });
    expect(byteRange('bytes=10-19', 100)).toEqual({ start: 10, end: 19 });
    expect(byteRange('bytes=100-', 100)).toBeNull();
    expect(byteRange(undefined, 100)).toBeNull();
    expect(byteRange('items=1-2', 100)).toBeNull();
  });

  it('serves the whole native model file, then the rest of it after a dropped connection', async () => {
    const whole = await fetch(`${b}${LITERT_PATH}`);
    expect(whole.status).toBe(200);
    expect(whole.headers.get('accept-ranges')).toBe('bytes');
    expect((await whole.arrayBuffer()).byteLength).toBe(100);

    const rest = await fetch(`${b}${LITERT_PATH}`, { headers: { range: 'bytes=60-' } });
    expect(rest.status).toBe(206);
    expect(rest.headers.get('content-range')).toBe('bytes 60-99/100');
    expect([...new Uint8Array(await rest.arrayBuffer())]).toEqual(Array.from({ length: 40 }, (_, i) => 60 + i));
  });
});
