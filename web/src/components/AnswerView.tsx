import {
  DISCLAIMER,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  carriesNotice,
  findViolations,
  insectFacts,
  localizeEntry,
  type KnowledgeEntry,
} from '@ugatan/shared';
import type { ReactNode } from 'react';
import type { Labels } from '../config/labels';

export interface AnswerViewProps {
  matches: readonly KnowledgeEntry[];
  clear: boolean;
  labels: Labels;
  explanation?: string | null;
  explanationStatus?: 'ok' | 'blocked' | 'unavailable' | 'phone';
  /** True while the question waits in the queue for the hub. */
  waitingForHub?: boolean;
  /** True while Gemma is writing the explanation, on the phone or the hub. The keyword notes wait, so the reply is the model's. */
  thinking?: boolean;
  /** The symptom words the match was found on, shown as "Dahil sa". */
  matchedOn?: readonly string[];
  /** Shown when nothing matched and there is no model reply: a greeting's reply, instead of the no-match line. */
  fallback?: string;
  /** Language of the card text. Tagalog and Cebuano use the translated notes when they exist; anything else shows the English. */
  language?: string;
}

const SUBHEAD = 'mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-label';
const BULLETS = 'm-0 grid gap-1.5 pl-5 marker:text-leaf';

/** The model is asked for plain text but sometimes writes **bold**. Show it as bold, never as asterisks. */
function inlineBold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part.replace(/\*\*/g, ''),
  );
}

/**
 * The answer a farmer sees. One reply: the model's explanation when it is safe, otherwise a short line. The
 * matched notes show as "Tugma" only when the match passed the confidence threshold. The pesticide notice ends
 * only a reply that gives treatment advice.
 */
export function AnswerView({ matches, clear, labels, explanation, explanationStatus, waitingForHub, thinking, matchedOn = [], fallback, language = 'en' }: AnswerViewProps) {
  const explanationText = explanation?.trim() ?? '';
  const explanationSafe = explanationText !== '' && findViolations(explanationText).length === 0;
  // Unsafe text is never shown, even if the caller did not mark it as blocked.
  const blocked = explanationStatus === 'blocked' || (explanationText !== '' && !explanationSafe);

  // A match is shown as "Tugma" only when it is sure. A match that is not sure is never shown as one.
  const sure = matches.length > 0 && clear;
  const notSure = matches.length > 0 && !clear;
  const showStatus = thinking || waitingForHub || blocked || explanationStatus === 'unavailable';
  const names = matches.map((m) => m.name).join(', ');
  const notice = carriesNotice(sure, explanationSafe ? explanationText : null);

  return (
    <div className="grid gap-4 text-base leading-7" aria-live="polite">
      {/* One response. A reply the model wrote stands alone. The lines below are only for when there is no reply. */}
      {notSure && !explanationSafe && !thinking && <p className="m-0 rounded-2xl bg-warn px-4 py-3">{NOT_SURE_TEXT}</p>}
      {matches.length === 0 && !explanationSafe && !thinking && (
        <p className="m-0 rounded-2xl bg-warn px-4 py-3">{fallback ?? NO_MATCH_TEXT}</p>
      )}

      {(explanationSafe || showStatus) && (
        <div>
          {explanationSafe && <p className="m-0 whitespace-pre-wrap">{inlineBold(explanationText)}</p>}
          {thinking && !explanationSafe && (
            <p className="m-0 flex gap-1 text-muted" role="status" aria-label={labels.phoneAiLoading}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }}>
                  ●
                </span>
              ))}
            </p>
          )}
          {!explanationSafe && !thinking && blocked && <p className="m-0 text-sm text-muted">{labels.aiBlocked}</p>}
          {!explanationSafe && !thinking && !blocked && waitingForHub && (
            <p className="m-0 text-sm text-muted">{labels.aiWaiting}</p>
          )}
          {!explanationSafe && !thinking && !blocked && !waitingForHub && explanationStatus === 'unavailable' && (
            <p className="m-0 text-sm text-muted">{labels.aiNone}</p>
          )}
        </div>
      )}

      {sure && !thinking && (
        <details open={!explanationSafe} className="group rounded-2xl border border-sprout-line bg-sprout px-4 py-3.5">
          <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 leading-6">
              <span className="text-muted">{explanationSafe ? labels.matchedLabel : labels.notesOffline}:</span> {names}
            </span>
            <svg className="size-4 shrink-0 text-mist transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          {matchedOn.length > 0 && (
            <p className="mt-2 mb-0 text-sm text-muted">
              <span className="font-medium">{labels.matchedOnLabel}:</span> {matchedOn.map((w) => `"${w}"`).join(', ')}
            </p>
          )}
          <div className="mt-3 grid gap-5">
            {matches.map((original) => {
              const r = localizeEntry(original, language);
              const insect = insectFacts(r);
              return (
                <article key={r.id} className="[&+article]:border-t [&+article]:border-sprout-line [&+article]:pt-5">
                  <h3 className="m-0 text-lg font-bold leading-snug text-forest">{r.name}</h3>
                  {insect && (
                    <dl className="m-0 mt-3 grid gap-1.5 rounded-xl border border-sprout-line bg-white/70 px-3.5 py-3 text-[0.9375rem] leading-6">
                      <div>
                        <dt className="inline font-semibold">{labels.insectHeading}: </dt>
                        <dd className="m-0 inline">{insect.identity}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold">{labels.localNamesLabel}: </dt>
                        <dd className="m-0 inline">{insect.localNames}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold">{labels.attacksLabel}: </dt>
                        <dd className="m-0 inline">{insect.attacks}</dd>
                      </div>
                    </dl>
                  )}
                  <p className={SUBHEAD}>{labels.signsHeading}</p>
                  <ul className={BULLETS + ' list-disc'}>
                    {r.signs.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <p className={SUBHEAD}>{labels.stepsHeading}</p>
                  <ol className={BULLETS + ' list-decimal'}>
                    {r.actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ol>
                  {r.insect && (
                    <>
                      <p className={SUBHEAD}>{labels.naturalEnemiesHeading}</p>
                      <ul className={BULLETS + ' list-disc'}>
                        {r.insect.biological.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      <p className="mt-4 mb-0 rounded-xl border border-sprout-line bg-white/70 px-3.5 py-2.5 text-[0.9375rem] leading-6">
                        <strong className="font-semibold">{labels.lastResortHeading}:</strong> {labels.lastResortText}
                      </p>
                    </>
                  )}
                  <p className="mt-4 mb-0 rounded-xl bg-warn px-3.5 py-2.5 text-[0.9375rem] leading-6 text-ink">
                    <strong className="font-semibold">{labels.consultHeading}</strong> {r.callExpertIf}
                  </p>
                  {r !== original && (
                    // The translation is the app's own; the English is the source the notes were written in.
                    <details className="mt-3 text-sm text-muted">
                      <summary className="cursor-pointer">{labels.originalEnglish}</summary>
                      <ul className="m-0 mt-1 list-disc pl-6" lang="en">
                        {original.signs.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <ol className="m-0 mt-1 list-decimal pl-6" lang="en">
                        {original.actions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ol>
                      <p className="mb-0 mt-1" lang="en">
                        {original.callExpertIf}
                      </p>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </details>
      )}

      {notice && <p className="m-0 rounded-xl border-l-4 border-leaf bg-sprout px-4 py-3 text-[0.9375rem] font-semibold leading-6">{DISCLAIMER}</p>}
    </div>
  );
}
