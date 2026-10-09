import { useEffect, useState } from 'react';

export type BenchmarkItem = {
  id: string;
  label: string;
  ms: number;
  detail?: string;
};

export type BenchmarksPayload = {
  generatedAt?: string;
  machineNote?: string;
  status?: 'ok' | 'missing';
  items: BenchmarkItem[];
};

const EMPTY: BenchmarksPayload = { status: 'missing', items: [] };

/** Loads timings written by `pnpm --filter @ugatan/hub benchmark:landing`. */
export function useBenchmarks(): { data: BenchmarksPayload; loading: boolean } {
  const [data, setData] = useState<BenchmarksPayload>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch('/benchmarks.json', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return EMPTY;
        const json = (await res.json()) as BenchmarksPayload;
        if (!Array.isArray(json.items)) return EMPTY;
        return json;
      })
      .catch(() => EMPTY)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
