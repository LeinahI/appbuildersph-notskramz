import type { KnowledgeEntry } from '@ugatan/shared';
import { KNOWLEDGE } from '../config/knowledge';
import { L } from '../config/labels';
import { symptomTile } from '../symptoms';

/** Suggestion chips, like the starter prompts on the Claude home screen. One tap asks about that symptom. */
export function SymptomPicker({ onPick }: { onPick: (entry: KnowledgeEntry) => void }) {
  const items = KNOWLEDGE;
  return (
    <div>
      <p className="m-0 mb-2 text-sm font-medium text-muted">{L.symptomsHeading}</p>
      <p className="m-0 mb-2.5 text-[0.8125rem] text-muted">{L.symptomsHint}</p>
      <div className="flex flex-wrap gap-2" role="list">
        {items.map((e) => {
          const tile = symptomTile(e.id);
          return (
            <button
              key={e.id}
              role="listitem"
              className="flex items-center gap-2 rounded-xl border border-line bg-transparent px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-soft"
              onClick={() => onPick(e)}
            >
              <span className="text-xl" aria-hidden="true">
                {tile.icon}
              </span>
              <span>{tile.labelTl || e.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
