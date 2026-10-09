import type { KnowledgeEntry } from '@ugatan/shared';
import { KNOWLEDGE } from '../config/knowledge';
import type { Labels } from '../config/labels';
import { symptomTile } from '../symptoms';

/** Suggestion chips for a farmer who is unsure of the word. One tap asks about that symptom. */
export function SymptomPicker({ labels, onPick }: { labels: Labels; onPick: (entry: KnowledgeEntry) => void }) {
  return (
    <div className='text-left'>
      <p className='m-0 mb-1 text-sm font-semibold text-label'>{labels.symptomsHeading}</p>
      <p className='m-0 mb-3 text-sm text-mist'>{labels.symptomsHint}</p>
      <div className='flex flex-wrap gap-2' role='list'>
        {KNOWLEDGE.map((entry) => {
          const tile = symptomTile(entry.id);
          return (
            <button
              key={entry.id}
              type='button'
              role='listitem'
              className='flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-white px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-leaf-soft'
              onClick={() => onPick(entry)}
            >
              <span className='text-xl' aria-hidden='true'>
                {tile.icon}
              </span>
              <span>{tile.labelTl || entry.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
