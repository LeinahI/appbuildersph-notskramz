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
import { useState, type ReactNode } from 'react';
import type { Labels } from '../config/labels';
import { leadParagraphs } from '../lib/answer-lead';
import { HighlightedText } from './HighlightedText';
import { SymptomArt, hasSymptomArt } from './SymptomArt';

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
  /** When set (from search), keyword matches in the model reply are marked. */
  highlightNeedle?: string;
  /** When set, a sure diagnosis ends with follow-up chips. The chosen question is sent as if the farmer typed it. */
  onFollowUp?: (question: string) => void;
  /** Opens the camera or gallery choice, for the "send a photo" chip. */
  onRequestPhoto?: () => void;
}

const SUBHEAD = 'm-0 mb-2.5 text-xs font-bold uppercase tracking-wide text-label';
const BUBBLE = 'm-0 rounded-2xl rounded-tl-md border border-sprout-line bg-paper px-4 py-3 shadow-[0_1px_4px_rgba(38,57,45,0.08)]';
const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** The model is asked for plain text but sometimes writes **bold**. Show it as bold, never as asterisks. */
function inlineBold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part.replace(/\*\*/g, ''),
  );
}

function Avatar() {
  return (
    <span className="mt-0.5 grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-sprout-line bg-paper shadow-[0_1px_3px_rgba(38,57,45,0.12)]" aria-hidden="true">
      <img className="size-5 object-contain" src="/UgatanLogoIcon.svg" alt="" />
    </span>
  );
}

/** The one place the pesticide advisory shows: a quiet line at the foot of the card or the reply. */
function Advisory({ className = '' }: { className?: string }) {
  return (
    <p className={`m-0 flex items-start gap-2 text-[0.8125rem] leading-5 text-mist ${className}`}>
      <svg className="mt-0.5 size-4 shrink-0 text-leaf/80" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
        <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
      </svg>
      <span>{DISCLAIMER}</span>
    </p>
  );
}

/** `TL | EN`: switches the curated notes of one card between the farmer's language and the English they came from. */
function LanguageSwitch({ language, english, onChange, label }: { language: string; english: boolean; onChange: (english: boolean) => void; label: string }) {
  const option = (isEnglish: boolean, text: string) => (
    <button
      type="button"
      aria-pressed={english === isEnglish}
      // The pill is 32px tall; the pseudo-element stretches the tap area to 48px.
      className={`relative h-8 rounded-full px-3 text-xs font-bold tracking-wide transition-colors before:absolute before:-inset-x-0.5 before:-inset-y-2 before:content-[''] motion-reduce:transition-none ${
        english === isEnglish ? 'bg-paper text-leaf shadow-sm' : 'text-mist hover:text-leaf'
      }`}
      onClick={() => onChange(isEnglish)}
    >
      {text}
    </button>
  );
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 items-center rounded-full bg-leaf-soft p-0.5">
      {option(false, language.toUpperCase())}
      {option(true, 'EN')}
    </div>
  );
}

interface DiagnosisCardProps {
  original: KnowledgeEntry;
  language: string;
  labels: Labels;
  /** The model's prose for this problem, already stripped of its own step list. */
  lead: ReactNode[];
  status: ReactNode;
  matchedOn: readonly string[];
  explanationSafe: boolean;
  /** Starts on the English notes. For tests; a farmer taps the switch. */
  initialEnglish?: boolean;
}

/** One problem: tags and title, picture beside the signs, numbered steps, and the "call an expert" strip. */
export function DiagnosisCard({ original, language, labels, lead, status, matchedOn, explanationSafe, initialEnglish = false }: DiagnosisCardProps) {
  const [english, setEnglish] = useState(initialEnglish);
  const translated = localizeEntry(original, language);
  const canSwitch = translated !== original;
  const r = english ? original : translated;
  const insect = insectFacts(r);
  const picture = hasSymptomArt(r.id);

  return (
    <article className="px-5 py-5 md:px-6 [&+article]:border-t [&+article]:border-sprout-line">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="rounded-full bg-sprout px-2.5 py-1 text-label">{r.crop === 'corn' ? labels.cropTabCorn : labels.cropTabRice}</span>
            <span className="rounded-full bg-leaf-soft px-2.5 py-1 text-leaf">{labels.matchHigh}</span>
          </p>
          <h3 className="m-0 mt-2.5 text-xl font-bold leading-snug text-forest">{r.name}</h3>
        </div>
        {canSwitch && <LanguageSwitch language={language} english={english} onChange={setEnglish} label={labels.notesLanguageLabel} />}
      </header>

      <div className="mt-4 grid gap-5 leading-relaxed">
        {(matchedOn.length > 0 || !explanationSafe) && (
          <p className="m-0 text-sm text-muted">
            {!explanationSafe && <span>{labels.notesOffline}. </span>}
            {matchedOn.length > 0 && (
              <span>
                <span className="font-medium">{labels.matchedOnLabel}:</span> {matchedOn.map((w) => `"${w}"`).join(', ')}
              </span>
            )}
          </p>
        )}
        {(lead.length > 0 || status) && (
          <div className="grid gap-2">
            {lead.map((paragraph, i) => (
              <p key={i} className="m-0 whitespace-pre-wrap">{paragraph}</p>
            ))}
            {status}
          </div>
        )}

        {/* The picture sits beside the signs on a wide card, so the farmer can compare as they read. */}
        <div className={`grid gap-4 ${picture ? 'md:grid-cols-[12rem_1fr] md:gap-6' : ''}`}>
          {picture && (
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-sprout md:self-start">
              <SymptomArt id={r.id} />
            </div>
          )}
          <div>
            <h4 className={SUBHEAD}>{labels.signsHeading}</h4>
            <ul className="m-0 grid list-disc gap-1.5 pl-5 marker:text-leaf/70">
              {r.signs.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className={SUBHEAD}>{labels.stepsHeading}</h4>
          <ol className="m-0 grid list-none gap-3 p-0">
            {r.actions.map((a, i) => (
              <li key={a} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-leaf-soft text-xs font-bold text-leaf" aria-hidden="true">{i + 1}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>

        {insect && (
          <dl className="m-0 grid gap-1 text-[0.9375rem] text-muted">
            <div>
              <dt className="inline font-semibold text-ink">{labels.insectHeading}: </dt>
              <dd className="m-0 inline">{insect.identity}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">{labels.localNamesLabel}: </dt>
              <dd className="m-0 inline">{insect.localNames}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">{labels.attacksLabel}: </dt>
              <dd className="m-0 inline">{insect.attacks}</dd>
            </div>
          </dl>
        )}
        {r.insect && (
          <div>
            <h4 className={SUBHEAD}>{labels.naturalEnemiesHeading}</h4>
            <ul className="m-0 grid list-disc gap-1.5 pl-5 marker:text-leaf/70">
              {r.insect.biological.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mb-0 mt-3 text-[0.9375rem] text-muted">
              <strong className="font-semibold text-ink">{labels.lastResortHeading}:</strong> {labels.lastResortText}
            </p>
          </div>
        )}

        <p className="m-0 flex items-start gap-3 rounded-xl bg-amber-50/60 px-4 py-3 text-[0.9375rem] text-amber-900">
          <svg className="mt-0.5 size-5 shrink-0 text-amber-700/80" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
            <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
            <path d="M12 10v4M12 17.2v.01" />
          </svg>
          <span>
            <strong className="font-semibold">{labels.consultHeading}</strong> {r.callExpertIf}
          </span>
        </p>
      </div>
    </article>
  );
}

const CHIP =
  'inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-sprout-line bg-sprout/60 px-4 text-sm font-medium text-label transition-colors hover:bg-leaf-soft active:bg-leaf-soft motion-reduce:transition-none';

/**
 * The answer a farmer sees. One reply: the model's explanation when it is safe, otherwise a short line. A match the
 * app is sure of is one diagnosis card that holds the explanation, the reference picture, the signs, the steps, and
 * the pesticide notice, so nothing is said twice. The notice ends only a reply that gives treatment advice.
 */
export function AnswerView({
  matches,
  clear,
  labels,
  explanation,
  explanationStatus,
  waitingForHub,
  thinking,
  matchedOn = [],
  fallback,
  language = 'en',
  highlightNeedle = '',
  onFollowUp,
  onRequestPhoto,
}: AnswerViewProps) {
  const explanationText = explanation?.trim() ?? '';
  const explanationSafe = explanationText !== '' && findViolations(explanationText).length === 0;
  // Unsafe text is never shown, even if the caller did not mark it as blocked.
  const blocked = explanationStatus === 'blocked' || (explanationText !== '' && !explanationSafe);

  // A match is shown as a diagnosis only when it is sure. A match that is not sure is never shown as one.
  const sure = matches.length > 0 && clear;
  const notSure = matches.length > 0 && !clear;
  const showStatus = thinking || waitingForHub || blocked || explanationStatus === 'unavailable';
  const names = matches.map((m) => m.name).join(', ');
  const notice = carriesNotice(sure, explanationSafe ? explanationText : null);
  const showCard = sure && !thinking;

  const status = (
    <>
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
      {!explanationSafe && !thinking && !blocked && waitingForHub && <p className="m-0 text-sm text-muted">{labels.aiWaiting}</p>}
      {!explanationSafe && !thinking && !blocked && !waitingForHub && explanationStatus === 'unavailable' && (
        <p className="m-0 text-sm text-muted">{labels.aiNone}</p>
      )}
    </>
  );

  // Inside the card the steps are listed below, so the lead keeps only the prose. Search results keep the whole reply
  // so the match the farmer looked for is still there to find.
  const leadSource = explanationSafe ? (highlightNeedle ? [explanationText] : leadParagraphs(explanationText)) : [];
  const lead = leadSource.map((paragraph) => (highlightNeedle ? <HighlightedText key={paragraph} text={paragraph} needle={highlightNeedle} /> : inlineBold(paragraph)));

  const followUps = showCard && onFollowUp ? (
    <ul aria-label={labels.followUpsLabel} className="m-0 -mt-1 flex list-none gap-2 overflow-x-auto p-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <li>
        <button type="button" className={CHIP} onClick={() => onFollowUp(labels.followUpNaturalPrompt(matches[0]!.name))}>
          <svg className="size-4 text-leaf/80" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
            <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-10-1 12-5 17-9 17Z" />
            <path d="M4 21c2-5 5-8 9-10" />
          </svg>
          {labels.followUpNatural}
        </button>
      </li>
      <li>
        <button type="button" className={CHIP} onClick={() => onFollowUp(labels.followUpPreventPrompt(matches[0]!.name))}>
          <svg className="size-4 text-leaf/80" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
            <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
          </svg>
          {labels.followUpPrevent}
        </button>
      </li>
      {onRequestPhoto && (
        <li>
          <button type="button" className={CHIP} onClick={onRequestPhoto}>
            <svg className="size-4 text-leaf/80" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
              <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {labels.followUpPhoto}
          </button>
        </li>
      )}
    </ul>
  ) : null;

  return (
    <div className="flex items-start gap-2.5 md:gap-3" aria-live="polite">
      <Avatar />
      <div className="grid min-w-0 flex-1 gap-3 text-base leading-7">
        {/* One response. A reply the model wrote stands alone. The lines below are only for when there is no reply. */}
        {notSure && !explanationSafe && !thinking && <p className="m-0 rounded-2xl rounded-tl-md bg-warn px-4 py-3">{NOT_SURE_TEXT}</p>}
        {matches.length === 0 && !explanationSafe && !thinking && (
          <p className="m-0 rounded-2xl rounded-tl-md bg-warn px-4 py-3">{fallback ?? NO_MATCH_TEXT}</p>
        )}

        {!showCard && (explanationSafe || showStatus) && (
          <div className={BUBBLE}>
            {explanationSafe && (
              <p className="m-0 whitespace-pre-wrap">
                {highlightNeedle ? <HighlightedText text={explanationText} needle={highlightNeedle} /> : inlineBold(explanationText)}
              </p>
            )}
            {status}
          </div>
        )}

        {showCard && (
          <section
            aria-label={names}
            className="overflow-hidden rounded-3xl rounded-tl-md border border-sprout-line bg-paper shadow-[0_2px_12px_rgba(38,57,45,0.08)]"
          >
            {/* A sure match is the top problem only, the one the reply explains. The runner-up is not a diagnosis. */}
            {matches.slice(0, 1).map((original) => (
              <DiagnosisCard
                key={original.id}
                original={original}
                language={language}
                labels={labels}
                lead={lead}
                status={status}
                matchedOn={matchedOn}
                explanationSafe={explanationSafe}
              />
            ))}
            {notice && <Advisory className="px-5 pb-4 md:px-6" />}
          </section>
        )}

        {/* A reply with treatment advice but no diagnosis card still ends with the notice. */}
        {notice && !showCard && <Advisory className="px-1" />}

        {followUps}
      </div>
    </div>
  );
}
