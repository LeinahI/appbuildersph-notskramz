import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  MAX_HISTORY_TURNS,
  NOT_SURE_TEXT,
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
import { SymptomPicker } from './components/SymptomPicker';
import { VoiceInput } from './components/VoiceInput';
import { KNOWLEDGE, KNOWLEDGE_BY_ID } from './config/knowledge';
import { L } from './config/labels';
import { loadHubUrl } from './config/hub';
import { clearClaimLink } from './config/ws';
import { db, newId, type ConversationRow, type QueuedQuestion } from './lib/db';
import {
  ensureActiveConversation,
  loadActiveConversationId,
  pullRemoteConversations,
  questionsForConversation,
  renameConversation,
  saveActiveConversationId,
  saveConversationThread,
} from './lib/conversations';
import { phoneAi } from './lib/llm';
import { hubReachable, syncQueue } from './lib/sync';
import { symptomTile } from './symptoms';
import { useNavigate } from 'react-router-dom';

const ConversationSidebar = lazy(() => import('./components/ConversationSidebar'));

function entriesFor(ids: readonly string[]): KnowledgeEntry[] {
  return ids.map((id) => KNOWLEDGE_BY_ID.get(id)).filter((e): e is KnowledgeEntry => e !== undefined);
}

function matchOf(r: QueuedQuestion): { entries: KnowledgeEntry[]; clear: boolean; matchedOn: string[] } {
  if (r.hubMatchIds && !r.symptomId) {
    return { entries: entriesFor(r.hubMatchIds), clear: r.hubClear ?? false, matchedOn: r.hubMatchedOn ?? [] };
  }
  return { entries: entriesFor(r.matchIds), clear: r.clear, matchedOn: r.matchedOn ?? [] };
}

function turnOf(r: QueuedQuestion): ChatTurn {
  const { entries, clear } = matchOf(r);
  const fallback =
    r.route === 'chat' ? smallTalkReply(r.text) : clear && entries.length ? `Tugma: ${entries.map((e) => e.name).join(', ')}` : NOT_SURE_TEXT;
  return { question: r.text, reply: r.explanation?.trim() || fallback };
}

function outcomeOf(r: QueuedQuestion): TurnOutcome {
  if (matchOf(r).clear) return 'clear';
  return r.route === 'chat' ? 'small' : 'ask';
}

const CROP: Crop | 'any' = 'any';

const hasSign = (text: string) => matchKeywords(text, 'any', KNOWLEDGE).matches.length > 0;

interface Plan {
  route: Route;
  description: string;
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

const SIDEBAR_KEY = 'ugatan.sidebarOpen';

export default function App() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [history, setHistory] = useState<QueuedQuestion[]>([]);
  const [unsaved, setUnsaved] = useState<QueuedQuestion[]>([]);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [listKey, setListKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const hubUrl = loadHubUrl();
  const [notice, setNotice] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const conversationId = conversation?.id ?? '';

  const refresh = useCallback(async () => {
    if (!conversationId) return;
    try {
      setHistory(await questionsForConversation(conversationId));
    } catch {
      // IndexedDB blocked
    }
  }, [conversationId]);

  useEffect(() => {
    void (async () => {
      await pullRemoteConversations();
      const c = await ensureActiveConversation();
      setConversation(c);
      setListKey((k) => k + 1);
    })();
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    const result = await syncQueue(hubUrl);
    if (result.sent) setNotice(`Naipadala ang ${result.sent} tanong sa hub.`);
    await refresh();
    if (conversationId) void saveConversationThread(conversationId);
  }, [hubUrl, refresh, conversationId]);

  useEffect(() => {
    if (!hubUrl) return;
    void syncNow();
    const onOnline = () => void syncNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [hubUrl, syncNow]);

  const messages = history.concat(unsaved.filter((u) => u.conversationId === conversationId));

  const lastKey = `${messages.length}:${messages[messages.length - 1]?.explanation ?? ''}:${messages[messages.length - 1]?.hubMatchIds?.join() ?? ''}:${busyId}`;
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [lastKey]);

  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [text]);

  function toggleSidebar() {
    setSidebarOpen((o) => {
      const next = !o;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  function selectConversation(c: ConversationRow) {
    saveActiveConversationId(c.id);
    setConversation(c);
    setUnsaved([]);
    setText('');
    setPickerOpen(false);
    setNotice('');
  }

  async function ask(question: string, symptomId?: string) {
    if (!conversation) return;
    const trimmed = question.trim();
    setNotice('');
    setPickerOpen(false);

    const earlier = messages.map((m) => m.text);
    const picked = symptomId ? KNOWLEDGE_BY_ID.get(symptomId) : undefined;
    const plan: Plan = picked
      ? { route: 'match', description: trimmed, notes: [], crop: 'any', entries: [picked], clear: true, matchedOn: [] }
      : planFor(trimmed, earlier);

    const followUps = messages.reduce((n, r) => nextFollowUps(n, outcomeOf(r)), 0);
    const final = isFinalAnswer(followUps);
    const bestGuess = plan.route === 'match' && plan.entries.length > 0 && !plan.clear && final;
    const turns = messages.slice(-MAX_HISTORY_TURNS).map(turnOf);
    const record: QueuedQuestion = {
      uid: newId(),
      crop: CROP,
      text: trimmed,
      history: turns,
      symptomId,
      sessionId: conversation.sessionId,
      conversationId: conversation.id,
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
      if (messages.length === 0 && conversation.title === 'Bagong usapan') {
        const title = trimmed.slice(0, 48);
        await renameConversation(conversation.id, title);
        setConversation({ ...conversation, title });
        setListKey((k) => k + 1);
      }
    } catch {
      setNotice(L.saveError);
      setUnsaved((u) => [...u, record]);
    }
    await refresh();

    if (phoneAi.ready && id !== undefined && plan.route === 'match' && plan.entries.length > 0) {
      setBusyId(id);
      try {
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
      if (id !== undefined) setBusyId(id);
      try {
        await syncNow();
      } finally {
        setBusyId(null);
      }
    } else if (phoneAi.ready && id !== undefined) {
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
    void saveConversationThread(conversation.id);
    setListKey((k) => k + 1);
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

  function logoutFarmer() {
    clearClaimLink();
    navigate('/');
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
    <div className="relative flex h-dvh">
      <Suspense fallback={null}>
        <ConversationSidebar
          open={sidebarOpen}
          activeId={conversationId || loadActiveConversationId()}
          onToggle={toggleSidebar}
          onSelect={selectConversation}
          onCreated={(c) => {
            selectConversation(c);
            setListKey((k) => k + 1);
          }}
          onDeleted={async (id) => {
            if (id === conversationId) {
              const next = await ensureActiveConversation();
              selectConversation(next);
            }
            setListKey((k) => k + 1);
          }}
          refreshKey={listKey}
        />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`flex h-14 shrink-0 items-center justify-between px-4 ${sidebarOpen ? '' : 'pl-14'}`}>
          <h1 className="m-0 truncate font-serif text-[1.375rem] font-medium tracking-tight">
            {conversation?.title || L.appName}
          </h1>
          <button type="button" className="pill-btn !px-3 !py-1.5 text-sm" onClick={logoutFarmer}>
            Log out
          </button>
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
      </div>
    </div>
  );
}
