import { nextFollowUps, sessionNotes, type ChatTurn, type TurnOutcome } from '@ugatan/shared';

/** Most chats the hub keeps in memory. The one nobody has written to for longest goes first. */
export const MAX_SESSIONS = 200;
/** A chat nobody writes to for this long is forgotten. The phone sends its history again when the farmer comes back. */
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
/** Questions and notes kept per chat. Matching reads only the newest part of the notes anyway. */
const MAX_KEPT = 40;
/** Question and reply pairs kept per chat. The model reads the last few. */
const MAX_TURNS = 8;

/**
 * What the hub knows about one chat before the next question. Built from the phone's sessionId and kept between
 * questions, so every reply reads the whole conversation, not only the last message.
 */
export interface Session {
  /** Every question the farmer asked, oldest first. The crop is read from these. */
  questions: string[];
  /** The farmer's symptom messages, oldest first. Small talk is left out. The matcher reads these. */
  notes: string[];
  /** The last few question and reply pairs, as the phone showed them. */
  turns: ChatTurn[];
  /** Questions in a row the hub asked with no clear match. */
  followUps: number;
}

/** Chats in memory, by the phone's sessionId. Lost on restart, which the phone's history covers. */
export class ConversationStore {
  private readonly sessions = new Map<string, { session: Session; touched: number }>();
  private readonly clock: () => number;

  constructor(clock: () => number = Date.now) {
    this.clock = clock;
  }

  get(id: string): Session | undefined {
    const entry = this.sessions.get(id);
    if (!entry) return undefined;
    if (this.clock() - entry.touched > SESSION_TTL_MS) {
      this.sessions.delete(id);
      return undefined;
    }
    return entry.session;
  }

  put(id: string, session: Session): void {
    // Delete first so the entry moves to the newest end of the Map.
    this.sessions.delete(id);
    this.sessions.set(id, { session, touched: this.clock() });
    for (const key of this.sessions.keys()) {
      if (this.sessions.size <= MAX_SESSIONS) break;
      this.sessions.delete(key);
    }
  }
}

/**
 * The chat before the new question. Taken from the store when the hub has it. Otherwise it is rebuilt from the
 * phone's history, so a hub that restarted, or a chat left idle, still reads what the farmer already said.
 */
export function sessionBefore(
  store: ConversationStore | undefined,
  sessionId: string | undefined,
  history: readonly ChatTurn[],
  hasSign: (text: string) => boolean,
): Session {
  const stored = sessionId && store ? store.get(sessionId) : undefined;
  if (stored) {
    return { questions: [...stored.questions], notes: [...stored.notes], turns: [...stored.turns], followUps: stored.followUps };
  }
  const questions = history.map((t) => t.question);
  return { questions, notes: sessionNotes(questions, hasSign), turns: history.slice(-MAX_TURNS), followUps: 0 };
}

/** The chat after one exchange. Small talk adds no note, and a clear match resets the follow-up count. */
export function sessionAfter(before: Session, question: string, reply: string, outcome: TurnOutcome): Session {
  return {
    questions: [...before.questions, question].slice(-MAX_KEPT),
    notes: outcome === 'small' ? [...before.notes] : [...before.notes, question].slice(-MAX_KEPT),
    turns: [...before.turns, { question, reply }].slice(-MAX_TURNS),
    followUps: nextFollowUps(before.followUps, outcome),
  };
}
