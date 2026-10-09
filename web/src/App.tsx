import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  NOT_SURE_TEXT,
  buildChatMessages,
  buildMessages,
  cropOfChat,
  fixedReply,
  isFinalAnswer,
  matchKeywords,
  nextFollowUps,
  notesToExplain,
  routeFor,
  sessionNotes,
  sessionText,
  smallTalkReply,
  tidyReply,
  ungroundedProblems,
  withProblemName,
  type ChatTurn,
  type Crop,
  type KnowledgeEntry,
  type Route,
  type TurnOutcome,
} from '@ugatan/shared';
import { AnswerView } from './components/AnswerView';
import { HelpDialog } from './components/HelpDialog';
import { HomePage } from './components/HomePage';
import { QueueList } from './components/QueueList';
import { SymptomPicker } from './components/SymptomPicker';
import { KNOWLEDGE, KNOWLEDGE_BY_ID } from './config/knowledge';
import { DEFAULT_UI_LANGUAGE, L, localeFor } from './config/labels';
import { loadHubUrl } from './config/hub';
import { clearClaimLink } from './config/ws';
import { db, newId, type ConversationRow, type QueuedQuestion } from './lib/db';
import {
  createLocalConversation,
  ensureActiveConversation,
  loadActiveConversationId,
  pullRemoteConversations,
  questionsForConversation,
  renameConversation,
  saveActiveConversationId,
  saveConversationThread,
} from './lib/conversations';
import { phoneAi, type PhoneAiState } from './lib/llm';
import { photoSrc, shrinkPhoto } from './lib/photo';
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

/** The hub takes at most 2000 characters a question and 16 KB a request, so the phone keeps what it sends short. */
const MAX_QUESTION_CHARS = 2000;
const HISTORY_TURNS = 8;
const HISTORY_CHARS = 600;

function clipTurn(t: ChatTurn): ChatTurn {
  const cut = (s: string) => (s.length > HISTORY_CHARS ? `${s.slice(0, HISTORY_CHARS).trimEnd()}...` : s);
  return { question: cut(t.question), reply: cut(t.reply) };
}

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

/** What the hub made of the photo: that it is being read, what it saw, or why it could not use it. */
function PhotoNote({ r, reading }: { r: QueuedQuestion; reading: boolean }) {
  if (!r.image) return null;
  const note = reading
    ? L.photoReading
    : r.photo === 'not-plant'
      ? L.photoNotPlant
      : r.photo === 'no-signs'
        ? L.photoNoSigns
        : r.photo === 'unreadable'
          ? L.photoUnreadable
          : r.photo === 'unavailable'
            ? L.photoUnavailable
            : null;
  return (
    <div className="grid gap-1 text-sm text-mist" role="status">
      {note && <p className="m-0">{note}</p>}
      {r.photo === 'ok' && r.photoSigns && (
        <p className="m-0">
          <span className="font-medium">{L.photoSeen}:</span> {r.photoSigns}
        </p>
      )}
    </div>
  );
}

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
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const hubUrl = loadHubUrl();
  const [, setHubOnline] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  // A photo chosen for the next question, as a base64 JPEG already shrunk for the hub.
  const [photo, setPhoto] = useState<string | null>(null);
  const endOfChat = useRef<HTMLDivElement>(null);
  const historyDialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);

  const conversationId = conversation?.id ?? '';

  useEffect(() => {
    document.documentElement.lang = DEFAULT_UI_LANGUAGE;
  }, []);

  useEffect(() => phoneAi.subscribe(setAi), []);

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
    setHubOnline(result.reachable);
    if (result.sent) setNotice(L.hubSent(result.sent));
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
    endOfChat.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [lastKey]);

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

  async function newChat() {
    const c = await createLocalConversation('Bagong usapan');
    selectConversation(c);
    setPhoto(null);
    setListKey((k) => k + 1);
  }

  async function ask(question: string, symptomId?: string, image?: string) {
    if (!conversation) return;
    const trimmed = question.trim().slice(0, MAX_QUESTION_CHARS);
    setNotice('');
    setPickerOpen(false);

    // Matching reads everything the farmer has said in this chat, not only this message.
    // A clear match closes a problem, so the next sign is matched on its own, not mixed with one already answered.
    let lastClear = messages.length - 1;
    while (lastClear >= 0 && outcomeOf(messages[lastClear]!) !== 'clear') lastClear--;
    const earlier = messages.slice(lastClear + 1).map((m) => m.text);
    const picked = symptomId ? KNOWLEDGE_BY_ID.get(symptomId) : undefined;
    const plan: Plan = picked
      ? { route: 'match', description: trimmed, notes: [], crop: 'any', entries: [picked], clear: true, matchedOn: [] }
      : planFor(trimmed, earlier);

    const followUps = messages.reduce((n, r) => nextFollowUps(n, outcomeOf(r)), 0);
    const final = isFinalAnswer(followUps);
    const bestGuess = plan.route === 'match' && plan.entries.length > 0 && !plan.clear && final;
    // The last few turns, as the farmer saw them, so the model answers what the farmer is saying now.
    const turns = messages.slice(-HISTORY_TURNS).map(turnOf).map(clipTurn);
    const record: QueuedQuestion = {
      uid: newId(),
      crop: CROP,
      text: trimmed,
      history: turns,
      symptomId,
      ...(image ? { image } : {}),
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

    // Phone AI, if the farmer prepared it. Otherwise the question waits for the hub.
    // Small talk and no-match questions have no notes to explain, so the hub (or the phone's chat) replies instead.
    // A photo is read only by the hub, so a question with a photo always waits for it.
    if (!image && phoneAi.ready && id !== undefined && plan.route === 'match' && plan.entries.length > 0) {
      setBusyId(id);
      try {
        // Keyword matching decided the problem. The phone model only explains it, and is told when the match is not sure.
        const given = notesToExplain(plan.entries, plan.clear || bestGuess);
        const generated = await phoneAi.generate(buildMessages(plan.description, CROP, given, { sure: plan.clear, bestGuess }));
        // The output rail: a reply that names a problem it was not given notes for is dropped, and the curated notes show instead.
        const raw = generated !== null && ungroundedProblems(generated, KNOWLEDGE, given, trimmed).length > 0 ? null : generated;
        await db.questions.update(id, {
          status: 'answered',
          // A sure match or a best guess always says the problem's name.
          explanation:
            raw === null
              ? null
              : plan.clear || bestGuess
                ? withProblemName(tidyReply(raw, trimmed), plan.entries[0]!.name, plan.clear)
                : tidyReply(raw, trimmed),
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
    } else if (!image && phoneAi.ready && id !== undefined) {
      // No match and no hub: the phone model replies to the whole chat and asks what they see.
      // It stays queued, so the hub still matches it later with Laya.
      setBusyId(id);
      try {
        // A pesticide, health, other-crop, or "who are you" message gets the app's fixed line, never the model's.
        const fixed = plan.route === 'chat' ? fixedReply(trimmed) : null;
        const unmatched = plan.route === 'match';
        const generated =
          fixed ??
          (await phoneAi.generate(
            buildChatMessages(trimmed, turns, undefined, { notes: plan.notes, unmatched, final: unmatched && final, crop: plan.crop }),
          ));
        // A chat reply has no notes to explain, so it may name no problem at all.
        const raw = generated !== null && ungroundedProblems(generated, KNOWLEDGE, [], trimmed).length > 0 ? null : generated;
        await db.questions.update(id, {
          explanation: raw === null ? null : tidyReply(raw, trimmed),
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
    const typed = text.trim();
    if (!typed && !photo) return;
    const image = photo ?? undefined;
    setText('');
    setPhoto(null);
    void ask(typed || L.photoDefaultText, undefined, image);
  }

  async function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await shrinkPhoto(file));
      setNotice('');
    } catch {
      setNotice(L.photoError);
    }
  }

  function onSymptom(entry: KnowledgeEntry) {
    const tile = symptomTile(entry.id);
    void ask(tile.labelTl || entry.name, entry.id);
  }

  function logoutFarmer() {
    clearClaimLink();
    navigate('/');
  }

  const empty = messages.length === 0;

  function prepareAi() {
    try {
      phoneAi.load();
    } catch {
      setAi({ status: 'error', device: '', progress: '', error: '' });
    }
  }

  const thread = empty ? null : (
    <div className="grid gap-8">
      <h1 className="sr-only">{L.appName}</h1>
      {messages.map((r) => {
        const { entries, clear, matchedOn } = matchOf(r);
        return (
          <div key={r.uid} className="grid gap-6">
            <div className="flex justify-end">
              <div className="grid max-w-[85%] justify-items-end gap-2">
                {r.image && (
                  <img src={photoSrc(r.image)} alt={L.photoPreview} className="block max-h-56 w-auto max-w-full rounded-2xl border border-line object-cover" />
                )}
                <p className="m-0 whitespace-pre-wrap rounded-3xl rounded-br-lg bg-leaf-soft px-5 py-3 text-base leading-7">{r.text}</p>
              </div>
            </div>
            <PhotoNote r={r} reading={busyId !== null && busyId === r.id} />
            <AnswerView
              labels={L}
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
      <div ref={endOfChat} />
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

      <div className="min-w-0 flex-1">
        <HomePage
          labels={L}
          text={text}
          notice={notice}
          hubUrl={hubUrl}
          photo={photo}
          suggestions={empty ? <SymptomPicker labels={L} onPick={onSymptom} /> : undefined}
          tray={!empty && pickerOpen ? <SymptomPicker labels={L} onPick={onSymptom} /> : undefined}
          symptomsOpen={pickerOpen}
          onSymptoms={empty ? undefined : () => setPickerOpen((open) => !open)}
          onTextChange={setText}
          onSubmit={submit}
          onHistory={() => historyDialog.current?.showModal()}
          onHelp={() => helpDialog.current?.showModal()}
          onLogout={logoutFarmer}
          onNewConversation={() => void newChat()}
          onPhotoFile={(file) => void onPhotoChosen(file)}
          onRemovePhoto={() => setPhoto(null)}
          onNotice={setNotice}
        >
          {thread}
        </HomePage>
      </div>
      <HelpDialog ref={helpDialog} ai={ai} onPrepareAi={prepareAi} />
      <dialog ref={historyDialog} className="chat-history" aria-labelledby="ugatan-history-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="ugatan-history-heading" className="m-0 text-xl font-semibold">{L.historyLabel}</h2>
          <button
            type="button"
            className="chat-icon-button"
            aria-label={L.closeHistory}
            title={L.closeHistory}
            onClick={() => historyDialog.current?.close()}
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </div>
        <QueueList items={history} labels={L} locale={localeFor(DEFAULT_UI_LANGUAGE)} />
      </dialog>
    </div>
  );
}
