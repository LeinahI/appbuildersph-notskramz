import {
  DISCLAIMER,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  findViolations,
  type KnowledgeEntry,
} from '@ugatan/shared';
import type { Labels } from '../config/labels';

export interface AnswerViewProps {
  matches: readonly KnowledgeEntry[];
  clear: boolean;
  labels: Labels;
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  waitingForHub?: boolean;
}

export function AnswerView({
  matches,
  clear,
  labels,
  explanation,
  explanationStatus,
  waitingForHub,
}: AnswerViewProps) {
  const explanationText = explanation?.trim() ?? '';
  const explanationSafe = explanationText !== '' && findViolations(explanationText).length === 0;
  const blocked = explanationStatus === 'blocked' || (explanationText !== '' && !explanationSafe);

  return (
    <section className='grid gap-3' aria-live='polite'>
      {matches.length === 0 && <p className='m-0 rounded-lg bg-warn p-2.5'>{NO_MATCH_TEXT}</p>}
      {matches.length > 0 && !clear && <p className='m-0 rounded-lg bg-warn p-2.5'>{NOT_SURE_TEXT}</p>}
      {matches.map((entry) => (
        <article key={entry.id} className='mt-3 border-t border-rule pt-3'>
          <h3 className='mb-1.5 text-base font-bold'>{entry.name}</h3>
          <p className='mt-2 mb-0.5 font-semibold text-label'>{labels.signsHeading}</p>
          <ul className='mb-1.5 list-disc pl-5'>
            {entry.signs.map((sign) => <li key={sign}>{sign}</li>)}
          </ul>
          <p className='mt-2 mb-0.5 font-semibold text-label'>{labels.stepsHeading}</p>
          <ol className='mb-1.5 list-decimal pl-5'>
            {entry.actions.map((action) => <li key={action}>{action}</li>)}
          </ol>
          <p className='text-[0.85rem]'><strong>{labels.consultHeading}</strong> {entry.callExpertIf}</p>
        </article>
      ))}
      <div>
        <p className='mt-2 mb-0.5 font-semibold text-label'>{labels.aiHeading}</p>
        {explanationSafe && <p className='m-0 whitespace-pre-wrap leading-[1.5]'>{explanationText}</p>}
        {!explanationSafe && blocked && <p className='text-[0.85rem] text-muted'>{labels.aiBlocked}</p>}
        {!explanationSafe && !blocked && waitingForHub && <p className='text-[0.85rem] text-muted'>{labels.aiWaiting}</p>}
        {!explanationSafe && !blocked && explanationStatus === 'unavailable' && (
          <p className='text-[0.85rem] text-muted'>{labels.aiNone}</p>
        )}
      </div>
      <p className='mb-0 border-t-2 border-leaf pt-2.5 font-semibold'>{DISCLAIMER}</p>
    </section>
  );
}
