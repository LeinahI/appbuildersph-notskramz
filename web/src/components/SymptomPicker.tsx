import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Crop, KnowledgeEntry } from '@ugatan/shared';
import { KNOWLEDGE } from '../config/knowledge';
import type { Labels } from '../config/labels';
import { symptomTile, type PlantPart } from '../symptoms';
import { CropIcon } from './CropIcon';
import { SymptomArt } from './SymptomArt';

type PartFilter = 'all' | PlantPart | 'pest';

const CROPS: Crop[] = ['rice', 'corn'];

const PART_DOT: Record<PlantPart, string> = {
  dahon: 'bg-[#5d9a52]',
  tangkay: 'bg-[#b4672a]',
  uhay: 'bg-[#d9a62e]',
};

function partLabel(labels: Labels, part: PlantPart): string {
  return part === 'dahon' ? labels.partLeaf : part === 'tangkay' ? labels.partStem : labels.partGrain;
}

function filterLabel(labels: Labels, filter: PartFilter): string {
  return filter === 'all' ? labels.partAll : filter === 'pest' ? labels.partPest : partLabel(labels, filter);
}

const FILTERS: PartFilter[] = ['all', 'dahon', 'tangkay', 'uhay', 'pest'];

function matchesFilter(entry: KnowledgeEntry, filter: PartFilter): boolean {
  const tile = symptomTile(entry.id);
  return filter === 'all' || (filter === 'pest' ? tile.pest : tile.part === filter);
}

interface SymptomPickerProps {
  labels: Labels;
  onPick: (entry: KnowledgeEntry) => void;
  /** Inside the composer tray: the grid scrolls in a bounded box instead of growing the page. */
  compact?: boolean;
}

/**
 * Picture list for a farmer who is unsure of the word. Pick the crop, optionally narrow by where on the plant the
 * damage is, and tap the picture that looks like the field. One tap asks about that symptom.
 */
export function SymptomPicker({ labels, onPick, compact = false }: SymptomPickerProps) {
  const [crop, setCrop] = useState<Crop>('rice');
  const [filter, setFilter] = useState<PartFilter>('all');
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const forCrop = useMemo(() => KNOWLEDGE.filter((entry) => entry.crop === crop), [crop]);
  const filters = FILTERS.filter((f) => f === 'all' || forCrop.some((entry) => matchesFilter(entry, f)));
  // A filter the other crop does not have falls back to "all" instead of showing an empty grid.
  const active = filters.includes(filter) ? filter : 'all';
  const shown = forCrop.filter((entry) => matchesFilter(entry, active));
  const tabs = CROPS.filter((c) => KNOWLEDGE.some((entry) => entry.crop === c));
  const cropName = (c: Crop) => (c === 'rice' ? labels.cropTabRice : labels.cropTabCorn);

  function onTabKey(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    setCrop(tabs[next]!);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className='@container w-full text-left'>
      {/* In a chat the toggle button already says this, so the tray keeps the heading for screen readers only. */}
      <h2 className={compact ? 'sr-only' : 'm-0 text-base font-bold text-label'}>{labels.symptomsHeading}</h2>
      {!compact && <p className='m-0 mb-3 mt-1 text-sm leading-5 text-mist'>{labels.symptomsHint}</p>}

      <div role='tablist' aria-label={labels.cropTabsLabel} className='grid grid-cols-2 gap-1 rounded-2xl bg-leaf-soft p-1'>
        {tabs.map((c, index) => {
          const selected = c === crop;
          return (
            <button
              key={c}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type='button'
              role='tab'
              id={`${uid}-tab-${c}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel`}
              tabIndex={selected ? 0 : -1}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-base font-bold transition-colors motion-reduce:transition-none ${
                selected ? 'bg-leaf text-white shadow-sm' : 'text-leaf hover:bg-white/60'
              }`}
              onClick={() => setCrop(c)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              <CropIcon crop={c} className='size-6' />
              {cropName(c)}
            </button>
          );
        })}
      </div>

      <div
        role='group'
        aria-label={labels.partFilterLabel}
        className={`mt-3 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? '-mx-3 px-3' : '-mx-4 px-4 @3xl:mx-0 @3xl:flex-wrap @3xl:px-0'}`}
      >
        {filters.map((f) => {
          const on = f === active;
          return (
            <button
              key={f}
              type='button'
              aria-pressed={on}
              className={`min-h-12 shrink-0 snap-start whitespace-nowrap rounded-full border px-5 text-[0.9375rem] font-semibold transition-colors motion-reduce:transition-none ${
                on ? 'border-leaf bg-leaf text-white' : 'border-sprout-line bg-paper text-leaf hover:bg-leaf-soft active:bg-leaf-soft'
              }`}
              onClick={() => setFilter(f)}
            >
              {filterLabel(labels, f)}
            </button>
          );
        })}
      </div>

      <div
        role='tabpanel'
        id={`${uid}-panel`}
        aria-labelledby={`${uid}-tab-${crop}`}
        className='mt-3'
      >
        {shown.length === 0 ? (
          <p className='m-0 rounded-2xl border border-dashed border-sprout-line p-6 text-center text-sm text-mist'>{labels.partFilterEmpty}</p>
        ) : (
          <ul
            className={`m-0 list-none p-0 ${
              compact
                ? '-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:thin]'
                : 'grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4'
            }`}
          >
            {shown.map((entry) => {
              const tile = symptomTile(entry.id);
              return (
                <li key={entry.id} className={compact ? 'w-40 shrink-0 snap-start' : 'min-w-0'}>
                  <button
                    type='button'
                    className='group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-rule bg-paper text-left shadow-[0_1px_2px_rgba(43,66,43,0.06)] transition motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:border-sprout-line hover:shadow-[0_6px_16px_rgba(43,66,43,0.12)] motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98] active:shadow-sm'
                    onClick={() => onPick(entry)}
                  >
                    <span className='relative block aspect-[4/3] w-full overflow-hidden bg-sprout'>
                      <SymptomArt id={entry.id} />
                      <span className='absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold leading-4 text-ink shadow-sm'>
                        <span aria-hidden='true' className={`size-2 rounded-full ${PART_DOT[tile.part]}`} />
                        {partLabel(labels, tile.part)}
                      </span>
                      {tile.pest && (
                        <span
                          className='absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm'
                          title={labels.partPest}
                        >
                          <svg className='size-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' aria-hidden='true'>
                            <ellipse cx='12' cy='14' rx='4.5' ry='6' />
                            <path d='M12 8V5M9 4l1.5 1.5M15 4l-1.5 1.5M7.5 12H4M7.8 16.5 5 19M16.5 12H20M16.2 16.5 19 19' />
                          </svg>
                          <span className='sr-only'>{labels.partPest}</span>
                        </span>
                      )}
                    </span>
                    <span className='flex flex-1 flex-col gap-0.5 p-3'>
                      <span className='text-[0.9375rem] font-bold leading-5 text-ink'>{tile.titleTl || entry.name}</span>
                      {tile.cueTl && <span className='text-[0.8125rem] leading-[1.15rem] text-mist'>{tile.cueTl}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
