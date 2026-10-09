import { normalize } from './keyword.js';

/** Where a question goes: to the matcher (a symptom), or to the chat (small talk, nothing to match). */
export type Route = 'match' | 'chat';

/** What a question came to, for counting follow-ups. */
export type TurnOutcome = 'clear' | 'ask' | 'small';

/** Two follow-up questions in a row with no clear match. After that the app gives its best answer and says what is uncertain. */
export const MAX_FOLLOW_UPS = 2;

/** The matcher reads the farmer's symptom messages joined together, up to this many characters, newest kept. */
export const SESSION_TEXT_CHARS = 1000;

const GREETING = /\b(hello|helo|hi|hey|hallo|kumusta|kamusta|musta|magandang (umaga|hapon|gabi|tanghali|araw)|good (morning|afternoon|evening|day))\b/;
const HELP = /\b(tulungan|tulong|matulungan|makatulong|help)\b/;
const THANKS = /\b(salamat|thank|thanks|thx|ty)\b/;
const FAREWELL = /\b(paalam|bye|goodbye|ingat)\b/;
/** Complaints about the last answer. They are talked through, not matched. */
const COMPLAINT = /\b(response mo|sagot mo|kausapin|ayusin mo|hindi ka|hindi mo|ulitin mo|di ka|bat ganyan)\b/;

/**
 * Greetings, thanks, goodbyes, requests for help, and complaints about the chat. They name no sign of a
 * problem by themselves. A message with a symptom in it is never small talk (see routeFor).
 */
export function isSmallTalk(text: string): boolean {
  const t = ` ${normalize(text)} `;
  if (t.trim() === '') return false;
  return [GREETING, HELP, THANKS, FAREWELL, COMPLAINT].some((re) => re.test(t));
}

/**
 * Small talk goes to the chat, and everything else goes to matching. `hasSign` is true when the message
 * contains a keyword from the knowledge base, which settles it: "hello po, may butas ang dahon" is a symptom.
 */
export function routeFor(text: string, hasSign: boolean): Route {
  return !hasSign && isSmallTalk(text) ? 'chat' : 'match';
}

/**
 * The reply for small talk when no model answers. The model's own chat reply is used when there is one.
 * Each line asks at most one question.
 */
export function smallTalkReply(text: string): string {
  const t = ` ${normalize(text)} `;
  if (THANKS.test(t) || FAREWELL.test(t)) return 'Walang anuman po. Balikan po ninyo ako kung may makita pa kayo sa palay o mais.';
  if (COMPLAINT.test(t)) return 'Pasensya na po. Sabihin po ninyo kung ano ang nakikita ninyo sa palay o mais para matulungan ko kayo.';
  if (HELP.test(t)) return 'Opo, ano po ang problema sa palay o mais ninyo?';
  return 'Magandang araw po! Ano po ang nakikita ninyo sa palay o mais?';
}

/**
 * The farmer's messages that describe a symptom, oldest first. Small talk is left out, so "hello po" never
 * changes the match. `hasSign` tells the matcher's keywords apart from words that are only chat.
 */
export function sessionNotes(questions: readonly string[], hasSign: (text: string) => boolean): string[] {
  return questions.filter((q) => routeFor(q, hasSign(q)) === 'match').map((q) => q.trim());
}

/**
 * The description the matcher reads: every symptom note so far, joined, newest kept when they run past
 * SESSION_TEXT_CHARS. Matching on this (not the last message alone) lets "may butas po siya" mean what the
 * farmer said two messages earlier.
 */
export function sessionText(notes: readonly string[]): string {
  const kept: string[] = [];
  let size = 0;
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i]!.trim();
    if (!note) continue;
    if (kept.length > 0 && size + note.length > SESSION_TEXT_CHARS) break;
    kept.unshift(note);
    size += note.length + 2;
  }
  return kept.join('. ');
}

/**
 * Keeps at most one question in a reply. Sentences that end in "?" after the first one are dropped, so a model
 * that asks three things still asks one. Line breaks (numbered steps) are kept.
 */
export function limitQuestions(text: string): string {
  let asked = false;
  return text
    .split('\n')
    .map((line) =>
      // Each sentence keeps its own punctuation and spacing. No lookbehind, so older Safari still parses the bundle.
      (line.match(/[^.?!]*[.?!]+\s*|[^.?!]+$/g) ?? [line])
        .filter((sentence) => {
          if (!sentence.includes('?')) return true;
          if (asked) return false;
          asked = true;
          return true;
        })
        .join('')
        .trim(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const TREATMENT =
  /\b(spray|pestisidyo|pesticide|pesticides|insecticide|fungicide|herbicide|pamatay|gamot|gamutin|tratuhin|treatment|kontrolin|control|lason|kemikal)\b/;

/** True when text gives treatment, control, or spraying advice. Such replies carry the pesticide notice. */
export function mentionsTreatment(text: string): boolean {
  return TREATMENT.test(` ${normalize(text)} `);
}

/**
 * The pesticide notice goes on a reply that gives treatment: a clear match (its steps are shown) or text that
 * advises spraying or control. Greetings, questions, and "not sure" replies do not carry it.
 */
export function carriesNotice(clearMatch: boolean, text?: string | null): boolean {
  return clearMatch || mentionsTreatment(text ?? '');
}

/** One more follow-up when the reply asked a question, none after a clear match, and small talk changes nothing. */
export function nextFollowUps(count: number, outcome: TurnOutcome): number {
  if (outcome === 'clear') return 0;
  if (outcome === 'ask') return count + 1;
  return count;
}

/** True once the app has asked MAX_FOLLOW_UPS questions with no clear match: give the best answer and say what is uncertain. */
export function isFinalAnswer(followUps: number): boolean {
  return followUps >= MAX_FOLLOW_UPS;
}
