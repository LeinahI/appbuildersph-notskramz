import { useEffect, useState } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useBenchmarks } from './useBenchmarks';

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10_000 ? 1 : 2)} s`;
  return `${Math.round(ms)} ms`;
}

function MsCounter({ ms }: { ms: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? ms : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(ms);
      return;
    }
    const controls = animate(0, ms, {
      duration: 0.85,
      ease: 'easeOut',
      onUpdate: (value) => setDisplay(value),
    });
    return () => controls.stop();
  }, [ms, reduce]);

  return <strong>{formatMs(display)}</strong>;
}

export function LandingBenchmarks() {
  const { data, loading } = useBenchmarks();
  const reduce = useReducedMotion();
  const items = data.items.filter((item) => Number.isFinite(item.ms) && item.ms > 0);
  const maxMs = items.reduce((m, item) => Math.max(m, item.ms), 1);

  return (
    <section className='landing-section landing-shell' id='benchmarks' aria-labelledby='landing-bench-title'>
      <h2 id='landing-bench-title'>AI speed on this hub</h2>
      <p className='landing-section-lead'>
        Wall-clock timings from <code>pnpm --filter @ugatan/hub benchmark:landing</code>
        {data.generatedAt ? ` · generated ${new Date(data.generatedAt).toLocaleString()}` : ''}
        {data.machineNote ? (
          <>
            {' · '}
            <span title='From node-llama-cpp inspect gpu (hub GGUF uses gpu: auto)'>{data.machineNote}</span>
          </>
        ) : null}
        .
      </p>

      {loading && <p className='text-mist'>Loading benchmarks…</p>}

      {!loading && items.length === 0 && (
        <div className='landing-bench-empty' role='status'>
          No measured timings yet. On a machine with hub models configured, run{' '}
          <code>pnpm --filter @ugatan/hub benchmark:landing</code> to write{' '}
          <code>web/public/benchmarks.json</code>. This page never invents numbers.
        </div>
      )}

      {items.length > 0 && (
        <div className='landing-bench-list'>
          {items.map((item) => {
            const pct = Math.max(6, Math.round((item.ms / maxMs) * 100));
            return (
              <article key={item.id} className='landing-bench-row'>
                <div className='landing-bench-meta'>
                  <span>{item.label}</span>
                  <MsCounter ms={item.ms} />
                </div>
                <div className='landing-bench-bar' aria-hidden='true'>
                  <motion.span
                    initial={reduce ? false : { width: '0%' }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                {item.detail && <p className='mb-0 mt-2 text-sm text-mist'>{item.detail}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
