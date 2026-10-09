import type { ReactNode } from 'react';
import { ShieldIcon } from './icons';

const LOGO = '/UgatanLogoSprout.webp';

export type Portal = 'farmer' | 'admin';

type Props = {
  portal: Portal;
  /** Brand panel copy (desktop, left side). */
  headline: string;
  tagline: string;
  points?: string[];
  /** Small badge above the card title, e.g. "Ugatan Staff Portal". */
  badge?: string;
  /** Top-right slot of the form column, e.g. a language toggle. */
  topRight?: ReactNode;
  children: ReactNode;
};

/** Field rows and a sun: a quiet agricultural backdrop for the brand panel. */
function FieldBackdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden="true">
      <circle cx="470" cy="150" r="70" fill="#d8f3dc" opacity="0.12" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M-20 ${560 + i * 52} Q 150 ${520 + i * 46} 300 ${550 + i * 52} T 620 ${540 + i * 52}`}
          stroke="#95d5b2"
          strokeWidth="2"
          opacity={0.1 + i * 0.04}
        />
      ))}
    </svg>
  );
}

/** Split-screen layout shared by the farmer and admin sign-in pages. */
export function AuthShell({ portal, headline, tagline, points, badge, topRight, children }: Props) {
  const admin = portal === 'admin';
  return (
    <div className={`min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] ${admin ? 'bg-[#f8f9fa]' : 'bg-cream'}`}>
      <aside
        className={`relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12 ${admin ? 'bg-[#10291f]' : 'bg-forest'}`}
      >
        <FieldBackdrop />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-white p-1.5">
            <img src={LOGO} alt="" className="h-full w-full object-contain" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">Ugatan</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="m-0 font-display text-4xl font-semibold leading-tight tracking-tight">{headline}</h2>
          <p className="mt-4 text-lg leading-relaxed text-emerald-100/85">{tagline}</p>
          {points?.length ? (
            <ul className="mt-8 grid list-none gap-3 p-0 text-base text-emerald-50/90">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="relative m-0 text-sm text-emerald-100/60">© Ugatan</p>
      </aside>

      <main className="relative flex min-h-screen items-center justify-center p-4 sm:p-8 lg:min-h-0">
        {topRight ? <div className="absolute right-4 top-4 sm:right-8 sm:top-6">{topRight}</div> : null}
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={LOGO} alt="" width={96} height={96} className="size-24 object-contain" />
            <h1 className="mb-0 mt-2 font-display text-3xl font-semibold tracking-tight text-forest">Ugatan</h1>
            {badge ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-700/25 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                {admin ? <ShieldIcon className="size-3.5" /> : null}
                {badge}
              </span>
            ) : null}
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_8px_30px_rgba(27,67,50,0.08)] sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
