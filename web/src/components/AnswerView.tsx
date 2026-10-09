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
    <section className="answer" aria-live="polite">
      {matches.length === 0 && <p className="notice">{NO_MATCH_TEXT}</p>}
      {matches.length > 0 && !clear && <p className="notice">{NOT_SURE_TEXT}</p>}

      {matches.map((r) => (
        <article key={r.id} className="ref">
          <h3>{r.name}</h3>
          <p className="label">Mga senyales</p>
          <ul>
            {r.signs.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="label">Mga hakbang</p>
          <ol>
            {r.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
          <p className="small">
            <strong>Kumonsulta agad kung:</strong> {r.callExpertIf}
          </p>
        </article>
      ))}

      <div className="ai-block">
        <p className="label">{L.aiHeading}</p>
        {explanationSafe && <p className="explain">{explanationText}</p>}
        {!explanationSafe && blocked && <p className="muted small">{L.aiBlocked}</p>}
        {!explanationSafe && !blocked && waitingForHub && <p className="muted small">{L.aiWaiting}</p>}
        {!explanationSafe && !blocked && explanationStatus === 'unavailable' && (
          <p className="muted small">{L.aiNone}</p>
        )}
      </div>

      <p className="disclaimer">{DISCLAIMER}</p>
    </section>
  );
}
