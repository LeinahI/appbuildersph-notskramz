import {
  DISCLAIMER,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  findViolations,
  type KnowledgeEntry,
} from '@ugatan/shared';
import type { ReactNode } from 'react';
import { L } from '../config/labels';

export interface AnswerViewProps {
  matches: readonly KnowledgeEntry[];
  clear: boolean;
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  /** True while the question waits in the queue for the hub. */
  waitingForHub?: boolean;
  /** True while Gemma is writing the explanation, on the phone or the hub. The keyword notes wait, so the reply is the model's. */
  thinking?: boolean;
  /** Which models produced the reply, for example "Laya + Gemma sa hub". Shown under the explanation. */
  source?: string;
}

const SUBHEAD = 'mt-3 mb-1 text-sm font-medium text-muted';

/** The model is asked for plain text but sometimes writes **bold**. Show it as bold, never as asterisks. */
function inlineBold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part.replace(/\*\*/g, ''),
  );
}

/** The answer a farmer sees. Curated notes first, then the AI explanation if it is safe, then the disclaimer. */
export function AnswerView({ matches, clear, explanation, explanationStatus, waitingForHub, thinking, source }: AnswerViewProps) {
  const explanationText = explanation?.trim() ?? '';
  const explanationSafe = explanationText !== '' && findViolations(explanationText).length === 0;
  // Unsafe text is never shown, even if the caller did not mark it as blocked.
  const blocked = explanationStatus === 'blocked' || (explanationText !== '' && !explanationSafe);

  const showStatus = thinking || waitingForHub || blocked || explanationStatus === 'unavailable';
  // The curated notes are the reference behind the model's reply. They show open only when no model reply is there.
  const notesOpen = !explanationSafe;
  const names = matches.map((m) => m.name).join(', ');

  return (
    <div className="grid gap-4 font-serif text-[1.0625rem] leading-[1.65]" aria-live="polite">
      {/* With no match, the model replies to what the farmer said. The canned line is only for when there is no reply. */}
      {matches.length === 0 && !explanationSafe && !thinking && (
        <p className="m-0 rounded-xl bg-warn px-3.5 py-2.5">{NO_MATCH_TEXT}</p>
      )}
      {matches.length > 0 && !clear && <p className="m-0 rounded-xl bg-warn px-3.5 py-2.5">{NOT_SURE_TEXT}</p>}

      {(explanationSafe || showStatus) && (
        <div>
          {explanationSafe && <p className="m-0 whitespace-pre-wrap">{inlineBold(explanationText)}</p>}
          {explanationSafe && source && <p className="m-0 mt-1.5 font-sans text-xs text-muted">{source}</p>}
          {thinking && !explanationSafe && (
            <p className="m-0 flex gap-1 text-muted" role="status" aria-label={L.phoneAiLoading}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }}>
                  ●
                </span>
              ))}
            </p>
          )}
          {!explanationSafe && !thinking && blocked && <p className="m-0 text-sm text-muted">{L.aiBlocked}</p>}
          {!explanationSafe && !thinking && !blocked && waitingForHub && (
            <p className="m-0 text-sm text-muted">{L.aiWaiting}</p>
          )}
          {!explanationSafe && !thinking && !blocked && !waitingForHub && explanationStatus === 'unavailable' && (
            <p className="m-0 text-sm text-muted">{L.aiNone}</p>
          )}
        </div>
      )}

      {matches.length > 0 && !thinking && (
        <details open={notesOpen} className="group rounded-xl border border-line px-3.5 py-2.5">
          <summary className="cursor-pointer list-none font-sans text-sm font-medium">
            <span className="text-muted">{explanationSafe ? L.matchedLabel : L.notesOffline}:</span> {names}
          </summary>
          <div className="mt-2 grid gap-4">
            {matches.map((r) => (
              <article key={r.id}>
                <h3 className="m-0 text-lg font-semibold">{r.name}</h3>
                <p className={SUBHEAD}>Mga senyales</p>
                <ul className="m-0 list-disc pl-6">
                  {r.signs.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className={SUBHEAD}>Mga hakbang</p>
                <ol className="m-0 list-decimal pl-6">
                  {r.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ol>
                <p className="mt-3 mb-0 text-[0.9375rem] text-muted">
                  <strong className="font-semibold text-ink">Kumonsulta agad kung:</strong> {r.callExpertIf}
                </p>
              </article>
            ))}
          </div>
        </details>
      )}

      <p className="m-0 border-t border-line pt-3 font-sans text-[0.9375rem] font-medium leading-normal">{DISCLAIMER}</p>
    </div>
  );
}
