import type { Crop, KnowledgeEntry } from '@ugatan/shared';
import { KNOWLEDGE } from '../config/knowledge';
import { L } from '../config/labels';
import { symptomTile } from '../symptoms';

export function SymptomPicker({
  crop,
  onPick,
}: {
  crop: Crop | 'any';
  onPick: (entry: KnowledgeEntry) => void;
}) {
  const items = KNOWLEDGE.filter((e) => crop === 'any' || e.crop === crop);
  return (
    <div>
      <p className="mt-2 mb-0.5 font-semibold text-label">{L.symptomsHeading}</p>
      <p className="text-[0.85rem] text-muted">{L.symptomsHint}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2" role="list">
        {items.map((e) => {
          const tile = symptomTile(e.id);
          return (
            <button
              key={e.id}
              role="listitem"
              className="grid justify-items-center gap-1 rounded-lg border border-sprout-line bg-sprout px-2 py-2.5 text-center font-semibold text-ink"
              onClick={() => onPick(e)}
            >
              <span className="text-[1.8rem]" aria-hidden="true">
                {tile.icon}
              </span>
              <span className="text-[0.85rem]">{tile.labelTl || e.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
