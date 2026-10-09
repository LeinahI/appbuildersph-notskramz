import { describe, expect, it } from 'vitest';
import { EndOfSpeech, FRAME_SECONDS, rms, speechThreshold, trimToSpeech } from '../src/lib/speech';

const RATE = 16000;

/** Repeatable room noise: a small linear congruential generator, so the tests never flake. */
function noise(seconds: number, amplitude: number, seed = 1): Float32Array {
  let x = seed;
  return Float32Array.from({ length: Math.round(seconds * RATE) }, () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return ((x / 0xffffffff) * 2 - 1) * amplitude;
  });
}

/** A voice-like tone: a few harmonics, so its level moves a little like speech does. */
function voice(seconds: number, amplitude: number): Float32Array {
  return Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = i / RATE;
    return amplitude * (Math.sin(2 * Math.PI * 180 * t) + 0.5 * Math.sin(2 * Math.PI * 360 * t) + 0.25 * Math.sin(2 * Math.PI * 720 * t)) / 1.75;
  });
}

const join = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

const seconds = (s: Float32Array | null) => (s ? s.length / RATE : null);

describe('trimToSpeech', () => {
  it('cuts the silence before and after speech, keeping a short margin', () => {
    const recording = join(noise(3, 0.003), voice(1.5, 0.4), noise(4, 0.003, 2));
    const cut = trimToSpeech(recording, RATE);
    // 1.5 s of speech plus about 0.25 s of margin on each side.
    expect(seconds(cut)).toBeGreaterThan(1.8);
    expect(seconds(cut)).toBeLessThan(2.2);
  });

  it('keeps a pause between words', () => {
    const recording = join(noise(1, 0.003), voice(1, 0.4), noise(1.2, 0.003, 3), voice(1, 0.4), noise(1, 0.003, 4));
    expect(seconds(trimToSpeech(recording, RATE))).toBeGreaterThan(3.2);
  });

  it('finds speech when the farmer starts at once', () => {
    expect(seconds(trimToSpeech(join(voice(2, 0.3), noise(2, 0.003)), RATE))).toBeGreaterThan(2);
  });

  it('gives nothing for room noise or silence, so the app need not ask the hub', () => {
    expect(trimToSpeech(noise(5, 0.004), RATE)).toBeNull();
    expect(trimToSpeech(new Float32Array(5 * RATE), RATE)).toBeNull();
    expect(trimToSpeech(new Float32Array(0), RATE)).toBeNull();
  });

  it('ignores a click or a bump that is too short to be a word', () => {
    expect(trimToSpeech(join(noise(2, 0.003), voice(0.06, 0.6), noise(2, 0.003, 2)), RATE)).toBeNull();
  });

  it('raises a quiet recording, but only so far', () => {
    const quiet = trimToSpeech(join(noise(1, 0.0005), voice(1, 0.1), noise(1, 0.0005, 2)), RATE)!;
    const peak = Math.max(...quiet.map(Math.abs));
    expect(peak).toBeGreaterThan(0.5);
    expect(peak).toBeLessThanOrEqual(0.9 + 1e-6);
    const faint = trimToSpeech(join(noise(1, 0.0002), voice(1, 0.02), noise(1, 0.0002, 2)), RATE)!;
    // Eight times is the most gain, so a very faint voice is raised but not to full level.
    expect(Math.max(...faint.map(Math.abs))).toBeLessThan(0.2);
  });

  it('leaves a loud recording as it is', () => {
    const tone = Float32Array.from({ length: RATE }, (_, i) => 0.95 * Math.sin((2 * Math.PI * 200 * i) / RATE));
    const cut = trimToSpeech(join(noise(0.5, 0.003), tone, noise(0.5, 0.003, 2)), RATE)!;
    expect(Math.max(...cut.map(Math.abs))).toBeCloseTo(0.95, 2);
  });

  it('does not change the recording it was given', () => {
    const recording = join(noise(1, 0.003), voice(1, 0.1), noise(1, 0.003, 2));
    const before = Float32Array.from(recording);
    trimToSpeech(recording, RATE);
    expect(Array.from(recording)).toEqual(Array.from(before));
  });
});

describe('levels', () => {
  it('measures rms', () => {
    expect(rms(Float32Array.from([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5);
    expect(rms(new Float32Array(0))).toBe(0);
  });

  it('sets the speech threshold from the room noise, with a floor', () => {
    expect(speechThreshold([0.01, 0.01, 0.01, 0.5])).toBeCloseTo(0.03);
    expect(speechThreshold([0.0001, 0.0001, 0.2])).toBe(0.005);
    expect(speechThreshold([])).toBe(0.005);
  });
});

describe('EndOfSpeech', () => {
  const frames = (s: number) => Math.round(s / FRAME_SECONDS);
  function run(detector: EndOfSpeech, levels: number[]): number {
    for (let i = 0; i < levels.length; i++) if (detector.push(levels[i]!)) return i;
    return -1;
  }
  const quiet = (s: number) => Array(frames(s)).fill(0.003);
  const talking = (s: number) => Array(frames(s)).fill(0.2);

  it('stops after a pause that follows speech', () => {
    const at = run(new EndOfSpeech(1.6), [...quiet(1), ...talking(2), ...quiet(3)]);
    expect(at * FRAME_SECONDS).toBeGreaterThan(1 + 2 + 1.5);
    expect(at * FRAME_SECONDS).toBeLessThan(1 + 2 + 1.8);
  });

  it('does not stop while the farmer is still silent', () => {
    expect(run(new EndOfSpeech(1.6), quiet(20))).toBe(-1);
  });

  it('does not stop for a short pause between words', () => {
    expect(run(new EndOfSpeech(1.6), [...quiet(1), ...talking(1), ...quiet(1), ...talking(1), ...quiet(1)])).toBe(-1);
  });

  it('does not take one click for speech', () => {
    const d = new EndOfSpeech(1.6);
    expect(run(d, [...quiet(1), ...talking(0.04), ...quiet(5)])).toBe(-1);
    expect(d.heard).toBe(false);
  });

  it('reports when speech was heard, and handles a farmer who talks at once', () => {
    const d = new EndOfSpeech(1.6);
    run(d, [...talking(1), ...quiet(0.5)]);
    expect(d.heard).toBe(true);
  });
});
