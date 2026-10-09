import {
  DISCLAIMER,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  findViolations,
  type KnowledgeEntry,
} from '@ugatan/shared';
import { L } from '../config/labels';

export interface AnswerViewProps {
  matches: readonly KnowledgeEntry[];
  clear: boolean;
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  /** True while the question waits in the queue for the hub. */
  waitingForHub?: boolean;
}

/** The answer a farmer sees. Curated notes first, then the AI explanation if it is safe, then the disclaimer. */
export function AnswerView({ matches, clear, explanation, explanationStatus, waitingForHub }: AnswerViewProps) {
  const explanationText = explanation?.trim() ?? '';
  const explanationSafe = explanationText !== '' && findViolations(explanationText).length === 0;
  // Unsafe text is never shown, even if the caller did not mark it as blocked.
  const blocked = explanationStatus === 'blocked' || (explanationText !== '' && !explanationSafe);

  return (
    <section className="grid gap-3" aria-live="polite">
      {matches.length === 0 && <p className="m-0 rounded-lg bg-warn p-2.5">{NO_MATCH_TEXT}</p>}
      {matches.length > 0 && !clear && <p className="m-0 rounded-lg bg-warn p-2.5">{NOT_SURE_TEXT}</p>}

      {matches.map((r) => (
        <article key={r.id} className="mt-3 border-t border-rule pt-3">
          <h3 className="mb-1.5 text-base font-bold">{r.name}</h3>
          <p className="mt-2 mb-0.5 font-semibold text-label">Mga senyales</p>
          <ul className="mb-1.5 list-disc pl-5">
            {r.signs.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-2 mb-0.5 font-semibold text-label">Mga hakbang</p>
          <ol className="mb-1.5 list-decimal pl-5">
            {r.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
          <p className="text-[0.85rem]">
            <strong>Kumonsulta agad kung:</strong> {r.callExpertIf}
          </p>
        </article>
      ))}

      <div>
        <p className="mt-2 mb-0.5 font-semibold text-label">{L.aiHeading}</p>
        {explanationSafe && <p className="m-0 whitespace-pre-wrap leading-[1.5]">{explanationText}</p>}
        {!explanationSafe && blocked && <p className="text-[0.85rem] text-muted">{L.aiBlocked}</p>}
        {!explanationSafe && !blocked && waitingForHub && (
          <p className="text-[0.85rem] text-muted">{L.aiWaiting}</p>
        )}
        {!explanationSafe && !blocked && explanationStatus === 'unavailable' && (
          <p className="text-[0.85rem] text-muted">{L.aiNone}</p>
        )}
      </div>

      <p className="mb-0 border-t-2 border-leaf pt-2.5 font-semibold">{DISCLAIMER}</p>
    </section>
  );
}
