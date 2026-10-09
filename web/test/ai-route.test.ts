import { describe, expect, it } from 'vitest';
import { preferHubAsk, resolveAiRoute } from '../src/lib/ai-route';

describe('resolveAiRoute', () => {
  it('uses LiteRT on native when away from the hub', () => {
    expect(resolveAiRoute({ hubOnline: false, native: true })).toEqual({
      text: 'litert',
      multimodal: 'phone-litert',
    });
  });

  it('uses ONNX in the browser when on the hub', () => {
    expect(resolveAiRoute({ hubOnline: true, native: false })).toEqual({
      text: 'onnx',
      multimodal: 'hub',
    });
  });

  it('sends native asks to the hub when on hub premises', () => {
    expect(resolveAiRoute({ hubOnline: true, native: true })).toEqual({
      text: 'hub',
      multimodal: 'hub',
    });
  });

  it('keeps browser ONNX cache path when away (no LiteRT plugin)', () => {
    expect(resolveAiRoute({ hubOnline: false, native: false })).toEqual({
      text: 'onnx',
      multimodal: 'none',
    });
  });
});

describe('preferHubAsk', () => {
  it('prefers the hub for native-on-hub text', () => {
    const route = resolveAiRoute({ hubOnline: true, native: true });
    expect(preferHubAsk(route, false, true)).toBe(true);
  });

  it('prefers the hub for photos when multimodal is hub', () => {
    const route = resolveAiRoute({ hubOnline: true, native: false });
    expect(preferHubAsk(route, true, true)).toBe(true);
  });

  it('stays on the phone when away, ready, and no image needing the hub', () => {
    const route = resolveAiRoute({ hubOnline: false, native: true });
    expect(preferHubAsk(route, false, true)).toBe(false);
  });
});
