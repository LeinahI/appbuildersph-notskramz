import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHONE_MODEL } from '../src/config/models';
import { canUseWebGpu } from '../src/lib/gpu';

type FakeAdapter = { features: Set<string>; limits: { maxBufferSize: number; maxStorageBufferBindingSize: number } };

const withGpu = (adapter: FakeAdapter | null | 'throws' | undefined) =>
  vi.stubGlobal('navigator', {
    ...(adapter === undefined
      ? {}
      : {
          gpu: {
            requestAdapter: async () => {
              if (adapter === 'throws') throw new Error('GPU process crashed');
              return adapter;
            },
          },
        }),
  });

const GB = 1024 ** 3;
/** What the Realme C67 4G (Adreno 610) reported inside the app on 2026-10-10. */
const realmeC67: FakeAdapter = { features: new Set(), limits: { maxBufferSize: GB, maxStorageBufferBindingSize: 128 * 1024 ** 2 } };
/** A desktop GPU like the dev laptop's RTX 4060, where both models ran. */
const desktop: FakeAdapter = { features: new Set(['shader-f16']), limits: { maxBufferSize: 4 * GB, maxStorageBufferBindingSize: 4 * GB - 4 } };
const laya = { f16: false, largestWeight: 206_300_000 };

afterEach(() => vi.unstubAllGlobals());

describe('whether the phone GPU can run the AI', () => {
  it('says no without WebGPU, without an adapter (the emulator), or when asking fails', async () => {
    for (const adapter of [undefined, null, 'throws'] as const) {
      withGpu(adapter);
      expect(await canUseWebGpu(PHONE_MODEL.gpu)).toBe(false);
    }
  });

  it('turns down an entry-level phone GPU for Gemma and Laya: no 16-bit shaders, 1 GB buffers, 128 MB bindings', async () => {
    withGpu(realmeC67);
    expect(await canUseWebGpu(PHONE_MODEL.gpu)).toBe(false);
    expect(await canUseWebGpu(laya)).toBe(false);
  });

  it('turns down a GPU with 16-bit shaders that still cannot hold the 1.17 GB embedding table', async () => {
    withGpu({ ...realmeC67, features: new Set(['shader-f16']) });
    expect(await canUseWebGpu(PHONE_MODEL.gpu)).toBe(false);
  });

  it('accepts a GPU that holds the largest weight and has 16-bit shaders', async () => {
    withGpu(desktop);
    expect(await canUseWebGpu(PHONE_MODEL.gpu)).toBe(true);
    expect(await canUseWebGpu(laya)).toBe(true);
  });
});
