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
      <p className="label">{L.symptomsHeading}</p>
      <p className="muted small">{L.symptomsHint}</p>
      <div className="symptoms" role="list">
        {items.map((e) => {
          const tile = symptomTile(e.id);
          return (
            <button key={e.id} role="listitem" className="symptom" onClick={() => onPick(e)}>
              <span className="icon" aria-hidden="true">
                {tile.icon}
              </span>
              <span className="small">{tile.labelTl || e.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
