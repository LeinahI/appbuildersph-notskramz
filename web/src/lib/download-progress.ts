/** Bytes received and bytes expected so far, across every file a model has started to download. */
export interface ByteProgress {
  loaded: number;
  total: number;
}

/** Adds up per-file progress, so a model's download reads as one number instead of restarting for each file. */
export class FileTally {
  private files = new Map<string, ByteProgress>();

  update(file: string, loaded: number, total: number): ByteProgress {
    this.files.set(file, { loaded: Math.min(loaded, total || loaded), total: total || loaded });
    return this.sum();
  }

  finish(file: string): ByteProgress {
    const f = this.files.get(file);
    if (f) f.loaded = f.total;
    return this.sum();
  }

  private sum(): ByteProgress {
    let loaded = 0;
    let total = 0;
    for (const f of this.files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    return { loaded, total };
  }
}

/**
 * One 0-99 number for the whole package, from each model's bytes. A model counts by the larger of its expected and seen
 * total, so the number does not jump back when a later file turns up. A ready model counts as whole. Callers keep the
 * highest value they have shown, so it never goes down.
 */
export function packagePercent(
  parts: { expected: number; bytes?: ByteProgress; ready: boolean }[],
): number {
  let done = 0;
  let all = 0;
  for (const p of parts) {
    const size = Math.max(p.expected, p.bytes?.total ?? 0);
    all += size;
    done += p.ready ? size : Math.min(p.bytes?.loaded ?? 0, size);
  }
  if (all <= 0) return 0;
  return Math.min(99, Math.floor((done / all) * 100));
}
