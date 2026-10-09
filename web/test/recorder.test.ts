import { describe, expect, it } from 'vitest';
import { AUDIO_SAMPLE_RATE, MAX_AUDIO_SECONDS } from '@ugatan/shared';
import { canRecord, pcm16Base64 } from '../src/lib/recorder';

const bytesOf = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));
const samplesOf = (b64: string) => {
  const bytes = bytesOf(b64);
  const view = new DataView(bytes.buffer);
  return Array.from({ length: bytes.length / 2 }, (_, i) => view.getInt16(i * 2, true));
};

describe('pcm16Base64', () => {
  it('writes 16-bit little-endian samples', () => {
    expect(samplesOf(pcm16Base64(Float32Array.from([0, 0.5, -0.5, 1, -1])))).toEqual([0, 16384, -16384, 32767, -32768]);
    // 256 as little-endian bytes is 00 01.
    expect(Array.from(bytesOf(pcm16Base64(Float32Array.from([256 / 32767]))))).toEqual([0, 1]);
  });

  it('clips samples that are too loud instead of wrapping them', () => {
    expect(samplesOf(pcm16Base64(Float32Array.from([2, -2])))).toEqual([32767, -32768]);
  });

  it('keeps at most the longest recording the hub reads', () => {
    const long = new Float32Array((MAX_AUDIO_SECONDS + 5) * AUDIO_SAMPLE_RATE);
    expect(bytesOf(pcm16Base64(long))).toHaveLength(MAX_AUDIO_SECONDS * AUDIO_SAMPLE_RATE * 2);
  });

  it('handles a long recording without running out of arguments', () => {
    expect(() => pcm16Base64(new Float32Array(MAX_AUDIO_SECONDS * AUDIO_SAMPLE_RATE))).not.toThrow();
  });

  it('gives an empty string for no samples', () => {
    expect(pcm16Base64(new Float32Array(0))).toBe('');
  });
});

describe('canRecord', () => {
  it('is false where there is no microphone API (the test runs in Node)', () => {
    expect(canRecord()).toBe(false);
  });
});
