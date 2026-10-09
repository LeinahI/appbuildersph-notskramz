import { nextFollowUps, sessionNotes, type AskResponse, type ChatTurn, type TurnOutcome } from '@ugatan/shared';

/** Most chats the hub keeps in memory. The one nobody has written to for longest goes first. */
export const MAX_SESSIONS = 200;
/** A chat nobody writes to for this long is forgotten. The phone sends its history again when the farmer comes back. */
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
/** Questions and notes kept per chat. Matching reads only the newest part of the notes anyway. */
const MAX_KEPT = 40;
/** Question and reply pairs kept per chat. The model reads the last few. */
const MAX_TURNS = 8;
/** Answers kept per chat, by request id, so a retried request gets the same answer back. */
const MAX_REPLIES = 20;

/**
 * What the hub knows about one chat before the next question. Built from the phone's sessionId and kept between
 * questions, so every reply reads the whole conversation, not only the last message.
 */
export interface Session {
  /** Every question the farmer asked, oldest first. The crop is read from these. */
  questions: string[];
  /**
   * The farmer's symptom messages about the problem still open, oldest first. Small talk and off-topic messages are
   * left out, and a clear match or a final answer closes the problem and empties them. The matcher reads these.
   */
  notes: string[];
  /** The knowledge id of the problem the app last named in this chat. Questions about it are answered from its notes. */
  lastMatch?: string;
  /** The last few question and reply pairs, as the phone showed them. */
  turns: ChatTurn[];
  /** Questions in a row the hub asked with no clear match. */
  followUps: number;
  /** The answers already given in this chat, by request id, newest last. */
  replies: { uid: string; response: AskResponse }[];
}

/** Chats in memory, by the phone's sessionId. Lost on restart, which the phone's history covers. */
export class ConversationStore {
  private readonly sessions = new Map<string, { session: Session; touched: number }>();
  /** The request currently running for each chat, and the ones queued behind it. */
  private readonly queues = new Map<string, Promise<unknown>>();
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

  /**
   * Runs one request at a time for a chat. Two questions from the same chat read and write the same notes, so the
   * second waits for the first to finish instead of overwriting it. Other chats are not held up.
   */
  exclusive<T>(id: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const run = previous.then(task);
    // The queue entry never rejects, so one failed request does not block the ones behind it.
    const settled = run.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(id, settled);
    void settled.then(() => {
      if (this.queues.get(id) === settled) this.queues.delete(id);
    });
    return run;
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
    return {
      questions: [...stored.questions],
      notes: [...stored.notes],
      turns: [...stored.turns],
      followUps: stored.followUps,
      replies: [...stored.replies],
      ...(stored.lastMatch ? { lastMatch: stored.lastMatch } : {}),
    };
  }
  const questions = history.map((t) => t.question);
  return { questions, notes: sessionNotes(questions, hasSign), turns: history.slice(-MAX_TURNS), followUps: 0, replies: [] };
}

/**
 * The chat after one exchange. Small talk adds no note. A clear match or a final answer closes the problem: its notes
 * are emptied, so the next sign is matched on its own and never mixed with a problem already answered. `named` is
 * the problem the reply named, if any.
 */
export function sessionAfter(before: Session, question: string, reply: string, outcome: TurnOutcome, named?: string): Session {
  const closed = outcome === 'clear' || outcome === 'done';
  const lastMatch = named ?? before.lastMatch;
  return {
    questions: [...before.questions, question].slice(-MAX_KEPT),
    notes: closed ? [] : outcome === 'small' ? [...before.notes] : [...before.notes, question].slice(-MAX_KEPT),
    turns: [...before.turns, { question, reply }].slice(-MAX_TURNS),
    followUps: nextFollowUps(before.followUps, outcome),
    replies: [...before.replies],
    ...(lastMatch ? { lastMatch } : {}),
  };
}

/** The chat with this answer kept under its request id, so a retry of the same request gets the same answer. */
export function withReply(session: Session, uid: string, response: AskResponse): Session {
  return { ...session, replies: [...session.replies, { uid, response }].slice(-MAX_REPLIES) };
}
