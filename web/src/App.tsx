import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  MAX_HISTORY_TURNS,
  NOT_SURE_TEXT,
  NO_MATCH_TEXT,
  buildChatMessages,
  buildMessages,
  cropOfChat,
  isFinalAnswer,
  limitQuestions,
  matchKeywords,
  nextFollowUps,
  notesToExplain,
  routeFor,
  sessionNotes,
  sessionText,
  smallTalkReply,
  type ChatTurn,
  type Crop,
  type KnowledgeEntry,
  type Route,
  type TurnOutcome,
} from '@ugatan/shared';
import { AnswerView } from './components/AnswerView';
import { SettingsDialog } from './components/SettingsDialog';
import { SymptomPicker } from './components/SymptomPicker';
import { VoiceInput } from './components/VoiceInput';
import { KNOWLEDGE, KNOWLEDGE_BY_ID } from './config/knowledge';
import { L } from './config/labels';
import { loadHubUrl } from './config/hub';
import { db, newId, type QueuedQuestion } from './lib/db';
import { phoneAi, type PhoneAiState } from './lib/llm';
import { hubReachable, syncQueue } from './lib/sync';
import { symptomTile } from './symptoms';

function entriesFor(ids: readonly string[]): KnowledgeEntry[] {
  return ids.map((id) => KNOWLEDGE_BY_ID.get(id)).filter((e): e is KnowledgeEntry => e !== undefined);
}

/**
 * Once the hub answers a typed question, show the hub's match. Its explanation is about those notes, and with
 * Gemma and Laya it reads wordings and languages the phone's keywords miss. A tapped picture keeps the farmer's pick.
 */
function matchOf(r: QueuedQuestion): { entries: KnowledgeEntry[]; clear: boolean; matchedOn: string[] } {
  if (r.hubMatchIds && !r.symptomId) {
    return { entries: entriesFor(r.hubMatchIds), clear: r.hubClear ?? false, matchedOn: r.hubMatchedOn ?? [] };
  }
  return { entries: entriesFor(r.matchIds), clear: r.clear, matchedOn: r.matchedOn ?? [] };
}


/** What the farmer saw as the reply to a question, as the model reads it in the next turn. */
function turnOf(r: QueuedQuestion): ChatTurn {
  const { entries, clear } = matchOf(r);
  const fallback =
    r.route === 'chat' ? smallTalkReply(r.text) : clear && entries.length ? `Tugma: ${entries.map((e) => e.name).join(', ')}` : NOT_SURE_TEXT;
  return { question: r.text, reply: r.explanation?.trim() || fallback };
}

/** How a question came out, counted the way the hub counts it: a clear match, small talk, or a reply that asked a question. */
function outcomeOf(r: QueuedQuestion): TurnOutcome {
  if (matchOf(r).clear) return 'clear';
  return r.route === 'chat' ? 'small' : 'ask';
}

// The farmer never picks a crop. The question itself says what the plant is, and Laya and Gemma read it from there.
const CROP: Crop | 'any' = 'any';

const CHAT_FROM_KEY = 'ugatan.chatFrom';
const SESSION_KEY = 'ugatan.sessionId';

/** Questions with an id above this belong to the current chat. Older ones stay in the device, and still sync. */
function loadChatFrom(): number {
  try {
    return Number(localStorage.getItem(CHAT_FROM_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** This chat's id. The hub keeps the chat's notes under it, so a follow-up is read with what the farmer said before. */
function loadSessionId(): string {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const fresh = newId();
    localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Storage blocked. The chat keeps one id until the page reloads.
    return newId();
  }
}

const hasSign = (text: string) => matchKeywords(text, 'any', KNOWLEDGE).matches.length > 0;

/** What the app does with a question, as the hub does it: small talk goes to the chat, and a symptom is matched on the whole chat. */
interface Plan {
  route: Route;
  /** The farmer's symptom messages so far, plus this question. The matcher and the model read it. */
  description: string;
  /** The farmer's earlier symptom messages, for the chat reply, so it never asks again for them. */
  notes: string[];
  crop: Crop | 'any';
  entries: KnowledgeEntry[];
  clear: boolean;
  matchedOn: string[];
}

function planFor(question: string, earlier: readonly string[]): Plan {
  const route = routeFor(question, hasSign(question));
  const notes = sessionNotes(earlier, hasSign);
  const description = sessionText([...notes, question]);
  const crop = cropOfChat(question, earlier.map((q) => ({ question: q, reply: '' })));
  if (route === 'chat') return { route, description, notes, crop, entries: [], clear: false, matchedOn: [] };
  const result = matchKeywords(description, crop, KNOWLEDGE);
  return {
    route,
    description,
    notes,
    crop,
    entries: result.matches.map((m) => m.entry),
    clear: result.clear,
    matchedOn: result.matches[0]?.hits ?? [],
  };
}

const ICON = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export default function App() {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<QueuedQuestion[]>([]);
  // Questions that could not be saved to IndexedDB. They still show in this session.
  const [unsaved, setUnsaved] = useState<QueuedQuestion[]>([]);
  const [chatFrom, setChatFrom] = useState(loadChatFrom);
  const [sessionId, setSessionId] = useState(loadSessionId);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const [hubUrl, setHubUrl] = useState(loadHubUrl);
  const [hubOnline, setHubOnline] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    try {
      setHistory(await db.questions.orderBy('id').reverse().limit(20).toArray());
    } catch {
      // IndexedDB blocked. The offline answer still shows.
    }
  }, []);

  useEffect(() => phoneAi.subscribe(setAi), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    const result = await syncQueue(hubUrl);
    setHubOnline(result.reachable);
    if (result.sent) setNotice(`Naipadala ang ${result.sent} tanong sa hub.`);
    await refresh();
  }, [hubUrl, refresh]);

  // Try to send the queue on start, and again whenever the phone reports a connection.
  useEffect(() => {
    if (!hubUrl) return;
    void syncNow();
    const onOnline = () => void syncNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [hubUrl, syncNow]);

  // Oldest first, like a chat thread.
  const messages = history
    .filter((r) => (r.id ?? 0) > chatFrom)
    .reverse()
    .concat(unsaved);

  // Keep the newest message in view as answers arrive.
  const lastKey = `${messages.length}:${messages[messages.length - 1]?.explanation ?? ''}:${messages[messages.length - 1]?.hubMatchIds?.join() ?? ''}:${busyId}`;
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [lastKey]);

  // The box grows with what is typed, up to a limit.
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [text]);

  async function ask(question: string, symptomId?: string) {
    const trimmed = question.trim();
    setNotice('');
    setPickerOpen(false);

    // Matching reads everything the farmer has said in this chat, not only this message.
    const earlier = messages.map((m) => m.text);
    const picked = symptomId ? KNOWLEDGE_BY_ID.get(symptomId) : undefined;
    const plan: Plan = picked
      ? { route: 'match', description: trimmed, notes: [], crop: 'any', entries: [picked], clear: true, matchedOn: [] }
      : planFor(trimmed, earlier);

    // Two questions in a row with no clear match: the reply gives its best guess and asks nothing more.
    const followUps = messages.reduce((n, r) => nextFollowUps(n, outcomeOf(r)), 0);
    const final = isFinalAnswer(followUps);
    const bestGuess = plan.route === 'match' && plan.entries.length > 0 && !plan.clear && final;
    // The last few turns, as the farmer saw them, so the model answers what the farmer is saying now.
    const turns = messages.slice(-MAX_HISTORY_TURNS).map(turnOf);
    const record: QueuedQuestion = {
      uid: newId(),
      crop: CROP,
      text: trimmed,
      history: turns,
      symptomId,
      sessionId,
      route: plan.route,
      createdAt: new Date().toISOString(),
      status: 'queued',
      matchIds: plan.entries.map((e) => e.id),
      clear: plan.clear,
      matchedOn: plan.matchedOn,
    };
    let id: number | undefined;
    try {
      id = await db.questions.add(record);
    } catch {
      setNotice(L.saveError);
      setUnsaved((u) => [...u, record]);
    }
    await refresh();

    // Phone AI, if the farmer prepared it. Otherwise the question waits for the hub.
    // Small talk and no-match questions have no notes to explain, so the hub (or the phone's chat) replies instead.
    if (phoneAi.ready && id !== undefined && plan.route === 'match' && plan.entries.length > 0) {
      setBusyId(id);
      try {
        // Keyword matching decided the problem. The phone model only explains it, and is told when the match is not sure.
        const raw = await phoneAi.generate(
          buildMessages(plan.description, CROP, notesToExplain(plan.entries, plan.clear || bestGuess), { sure: plan.clear, bestGuess }),
        );
        await db.questions.update(id, {
          status: 'answered',
          explanation: raw === null ? null : limitQuestions(raw),
          explanationStatus: raw === null ? 'blocked' : 'phone',
          answeredAt: new Date().toISOString(),
        });
      } catch (err) {
        setNotice(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    } else if (hubUrl && (await hubReachable(hubUrl))) {
      // Laya matches and Gemma explains on the hub. The reply waits for them instead of showing keyword notes first.
      if (id !== undefined) setBusyId(id);
      try {
        await syncNow();
      } finally {
        setBusyId(null);
      }
    } else if (phoneAi.ready && id !== undefined) {
      // No match and no hub: the phone model replies to the whole chat and asks what they see.
      // It stays queued, so the hub still matches it later with Laya.
      setBusyId(id);
      try {
        const raw = await phoneAi.generate(buildChatMessages(trimmed, turns, undefined, { notes: plan.notes, final }));
        await db.questions.update(id, {
          explanation: raw === null ? null : limitQuestions(raw),
          explanationStatus: raw === null ? 'blocked' : 'phone',
        });
      } catch (err) {
        setNotice(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    }
    await refresh();
  }

  function newChat() {
    // Starts an empty chat. Nothing is deleted: earlier questions stay on the device and queued ones still go to the hub.
    const last = history[0]?.id ?? chatFrom;
    setChatFrom(last);
    try {
      localStorage.setItem(CHAT_FROM_KEY, String(last));
    } catch {
      // Storage blocked. The new chat lasts until the page reloads.
    }
    // A new chat gets a new id, so the hub starts its notes from nothing.
    const fresh = newId();
    setSessionId(fresh);
    try {
      localStorage.setItem(SESSION_KEY, fresh);
    } catch {
      // Storage blocked. The id lasts until the page reloads.
    }
    setUnsaved([]);
    setText('');
    setNotice('');
    setPickerOpen(false);
    input.current?.focus();
  }

  function submit() {
    const question = text.trim();
    if (!question) return;
    setText('');
    void ask(question);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function onSymptom(entry: KnowledgeEntry) {
    const tile = symptomTile(entry.id);
    void ask(tile.labelTl || entry.name, entry.id);
  }

  function onTranscript(spoken: string) {
    setText((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
    input.current?.focus();
  }

  const empty = messages.length === 0;

  const composer = (
    <div className="grid gap-2">
      {notice && <p className="m-0 text-center text-[0.8125rem] text-muted">{notice}</p>}
      {!empty && pickerOpen && (
        <div className="rounded-2xl border border-line bg-surface p-3">
          <SymptomPicker onPick={onSymptom} />
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-line bg-surface p-2.5 shadow-[0_2px_16px_rgba(0,0,0,0.07)] transition-shadow focus-within:shadow-[0_2px_20px_rgba(0,0,0,0.12)]"
      >
        <textarea
          ref={input}
          rows={1}
          value={text}
          autoFocus
          aria-label={L.describe}
          placeholder={empty ? L.describePlaceholder : L.describe}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          className="block max-h-48 w-full resize-none bg-transparent px-2.5 pt-1.5 pb-2 text-base leading-6 outline-none placeholder:text-muted"
        />
        <div className="flex items-center gap-1">
          {!empty && (
            <button
              type="button"
              className={`icon-btn ${pickerOpen ? 'bg-soft text-ink' : ''}`}
              onClick={() => setPickerOpen((o) => !o)}
              aria-label={L.symptomsHeading}
              aria-expanded={pickerOpen}
              title={L.symptomsHeading}
            >
              <svg {...ICON}>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <VoiceInput onTranscript={onTranscript} />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label={L.send}
              title={L.send}
              className="inline-flex size-9 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent"
            >
              <svg {...ICON} strokeWidth={2.2}>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <h1 className="m-0 font-serif text-[1.375rem] font-medium tracking-tight">{L.appName}</h1>
        <div className="flex items-center gap-1">
          {!empty && (
            <button className="pill-btn inline-flex items-center gap-1.5 !px-3 !py-1.5" onClick={newChat}>
              <svg {...ICON} width={16} height={16}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {L.newChat}
            </button>
          )}
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label={L.settings} title={L.settings}>
            <svg {...ICON}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
      </header>

      {empty ? (
        <main className="flex flex-1 flex-col overflow-y-auto px-4">
          <div className="mx-auto my-auto grid w-full max-w-2xl gap-7 py-6">
            <div className="text-center">
              <h2 className="m-0 font-serif text-[2rem] font-normal leading-tight tracking-tight">{L.greeting}</h2>
              <p className="mx-auto mt-2 mb-0 max-w-md text-[0.9375rem] text-muted">{L.tagline}</p>
            </div>
            {composer}
            <SymptomPicker onPick={onSymptom} />
          </div>
        </main>
      ) : (
        <>
          <main ref={scroller} className="flex-1 overflow-y-auto px-4">
            <div className="mx-auto grid w-full max-w-3xl gap-8 py-6">
              {messages.map((r) => {
                const { entries, clear, matchedOn } = matchOf(r);
                return (
                  <div key={r.uid} className="grid gap-6">
                    <div className="flex justify-end">
                      <p className="m-0 max-w-[85%] whitespace-pre-wrap rounded-2xl bg-bubble px-4 py-2.5 text-base leading-6">
                        {r.text}
                      </p>
                    </div>
                    <AnswerView
                      matches={entries}
                      clear={clear}
                      matchedOn={matchedOn}
                      explanation={r.explanation}
                      explanationStatus={r.explanationStatus}
                      waitingForHub={r.status === 'queued' && !phoneAi.ready && busyId !== r.id}
                      thinking={busyId !== null && busyId === r.id}
                      fallback={r.route === 'chat' ? smallTalkReply(r.text) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </main>
          <div className="shrink-0 px-4 pt-2">
            <div className="mx-auto w-full max-w-3xl">{composer}</div>
          </div>
        </>
      )}

      <footer className="shrink-0 px-4 py-2.5 text-center text-xs text-muted">{L.footer}</footer>

      {settingsOpen && (
        <SettingsDialog
          ai={ai}
          hubUrl={hubUrl}
          hubOnline={hubOnline}
          onHubUrl={setHubUrl}
          onSyncNow={() => void syncNow()}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
