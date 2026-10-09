import { describe, expect, it } from 'vitest';
import { FileTally, packagePercent } from '../src/lib/download-progress';

describe('FileTally', () => {
  it('adds the files of one model and counts a finished file as whole', () => {
    const t = new FileTally();
    t.update('a.onnx', 50, 100);
    expect(t.update('b.onnx', 10, 200)).toEqual({ loaded: 60, total: 300 });
    expect(t.finish('a.onnx')).toEqual({ loaded: 110, total: 300 });
  });
});

describe('packagePercent', () => {
  const gb = 1e9;
  it('does not restart when a new file begins: the expected size is the floor', () => {
    const first = packagePercent([{ expected: 3 * gb, bytes: { loaded: 0.9 * gb, total: 1 * gb }, ready: false }]);
    const second = packagePercent([{ expected: 3 * gb, bytes: { loaded: 1 * gb, total: 2 * gb }, ready: false }]);
    expect(first).toBe(30);
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it('counts a ready model as whole and the other as it goes', () => {
    expect(
      packagePercent([
        { expected: 3 * gb, ready: true },
        { expected: 1 * gb, bytes: { loaded: 0.5 * gb, total: 1 * gb }, ready: false },
      ]),
    ).toBe(87);
  });

  it('stays under 100 until the caller finishes', () => {
    expect(packagePercent([{ expected: gb, bytes: { loaded: gb, total: gb }, ready: false }])).toBe(99);
  });
});
