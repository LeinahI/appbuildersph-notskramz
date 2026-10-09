import type { Crop, KnowledgeEntry } from '@ugatan/shared';
import { KNOWLEDGE } from '../config/knowledge';
import type { Labels } from '../config/labels';
import { symptomTile } from '../symptoms';

const GROUPS: { crop: Crop; title: string }[] = [
  { crop: 'rice', title: 'Palay' },
  { crop: 'corn', title: 'Mais' },
];

/** Suggestion list for a farmer who is unsure of the word, by crop. One tap asks about that symptom. */
export function SymptomPicker({ labels, onPick }: { labels: Labels; onPick: (entry: KnowledgeEntry) => void }) {
  return (
    <div className='w-full text-left'>
      <h2 className='m-0 text-base font-bold text-label'>{labels.symptomsHeading}</h2>
      <p className='m-0 mb-4 mt-1 text-sm leading-5 text-mist'>{labels.symptomsHint}</p>
      <div className='grid gap-5'>
        {GROUPS.map(({ crop, title }) => {
          const entries = KNOWLEDGE.filter((entry) => entry.crop === crop);
          if (entries.length === 0) return null;
          return (
            <section key={crop} aria-label={title}>
              <h3 className='m-0 mb-2 text-xs font-bold uppercase tracking-wide text-mist'>{title}</h3>
              <ul className='m-0 grid list-none gap-2 p-0'>
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type='button'
                      className='flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left text-[0.9375rem] leading-5 text-ink transition-colors hover:bg-leaf-soft active:bg-leaf-soft'
                      onClick={() => onPick(entry)}
                    >
                      <span>{symptomTile(entry.id).labelTl || entry.name}</span>
                      <svg className='size-4 shrink-0 text-mist' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
