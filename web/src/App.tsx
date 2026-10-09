import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  NOT_SURE_TEXT,
  SCOUTING_GUIDE,
  buildChatMessages,
  buildDescribeMessages,
  buildMessages,
  buildPhotoMessages,
  careGuideFor,
  cropOfChat,
  describeOutcome,
  detectCrop,
  dropRepeatedQuestions,
  findViolations,
  fitPlantPart,
  fixedReply,
  guardPromptLeak,
  guideReply,
  isFinalAnswer,
  isHelpAsk,
  isInjectionAttempt,
  matchKeywords,
  nextFollowUps,
  notesToExplain,
  photoIsSure,
  photoSignsOf,
  replyLanguage,
  routeFor,
  sessionNotes,
  sessionText,
  signChoices,
  smallTalkReply,
  tidyReply,
  ungroundedProblems,
  withProblemName,
  type ChatTurn,
  type Crop,
  type KnowledgeEntry,
  type PhotoStatus,
  type Route,
  type TurnOutcome,
} from '@ugatan/shared';
import { AnswerView } from './components/AnswerView';
import { HelpDialog } from './components/HelpDialog';
import { HighlightedText } from './components/HighlightedText';
import { HomePage } from './components/HomePage';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useConversationSidebar } from './components/useConversationSidebar';
import { notify } from './components/ToastHost';
import { SymptomPicker } from './components/SymptomPicker';
import { KNOWLEDGE, KNOWLEDGE_BY_ID } from './config/knowledge';
import { DEFAULT_UI_LANGUAGE, L } from './config/labels';
import { loadHubUrl } from './config/hub';
import { loadSetup } from './config/setup';
import { db, newId, type ConversationRow, type QueuedQuestion } from './lib/db';
import {
  createLocalConversation,
  ensureActiveConversation,
  loadActiveConversationId,
  questionsForConversation,
  renameConversation,
  resolveConversation,
  saveActiveConversationId,
} from './lib/conversations';
import { preferHubAsk, resolveAiRoute } from './lib/ai-route';
import { matchOnPhone } from './lib/hybrid';
import { prepareModels } from './lib/prepare';
import { phoneLaya, type LayaState } from './lib/laya';
import { phoneAi, phoneAiFit, type PhoneAiState } from './lib/llm';
import { NATIVE_AI } from './lib/native-llm';
import { photoSrc, shrinkPhoto } from './lib/photo';
import { hubCapabilities, hubReachable, syncQueue } from './lib/sync';
import { symptomTile } from './symptoms';
import { voiceNoticeIsInline } from './lib/voice-notice';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

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

/** Cap on the filled-in photo form, as on the hub (VISION_MAX_NEW_TOKENS). */
const PHOTO_MAX_NEW_TOKENS = 128;
/** Cap on Gemma's plain-English description of a question, as on the hub. */
const DESCRIBE_MAX_NEW_TOKENS = 80;

interface PhotoRead {
  status: PhotoStatus;
  signs: string | null;
  picks?: string[];
}

/**
 * Reads a photo with the phone's Gemma, through the same form the hub uses. The picks become signs in the knowledge
 * base's words. Like on the hub, a photo adds signs and never names the problem by itself.
 */
async function readPhotoOnPhone(image: string, note: string, crop: Crop | 'any'): Promise<PhotoRead> {
  try {
    const raw = await phoneAi.generate(buildPhotoMessages(note, crop), { image, maxNewTokens: PHOTO_MAX_NEW_TOKENS });
    // Null means the guardrail blocked the model's text, so nothing of it reaches the matcher.
    if (raw === null) return { status: 'unreadable', signs: null };
    const outcome = photoSignsOf(raw);
    if (outcome.kind === 'not-plant') return { status: 'not-plant', signs: null };
    if (outcome.kind === 'no-signs') return { status: 'no-signs', signs: null };
    if (findViolations(outcome.english).length > 0) return { status: 'unreadable', signs: null };
    return { status: 'ok', signs: outcome.english, ...(outcome.picks ? { picks: outcome.picks } : {}) };
  } catch {
    return { status: 'unreadable', signs: null };
  }
}

/** Gemma's plain-English description of the farmer's words, for the phone's hybrid matcher. */
async function describeOnPhone(text: string, crop: Crop | 'any'): Promise<string | null> {
  return describeOutcome(await phoneAi.generate(buildDescribeMessages(text, crop), { maxNewTokens: DESCRIBE_MAX_NEW_TOKENS }));
}

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

export default function App() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversationId: routeId } = useParams<{ conversationId?: string }>();
  const [text, setText] = useState('');
  const [unsaved, setUnsaved] = useState<QueuedQuestion[]>([]);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [routeLoadKey, setRouteLoadKey] = useState(0);
  const [routeLoadFailed, setRouteLoadFailed] = useState(false);
  const sidebar = useConversationSidebar();
  const [listKey, setListKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const hubUrl = loadHubUrl();
  const [, setHubOnline] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoRequest, setPhotoRequest] = useState(0);
  // A photo chosen for the next question, as a base64 JPEG already shrunk for the hub.
  const [photo, setPhoto] = useState<string | null>(null);
  const [highlightUid, setHighlightUid] = useState('');
  const [highlightNeedle, setHighlightNeedle] = useState('');
  const endOfChat = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const draftDialog = useRef<HTMLDialogElement>(null);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const navigationVersion = useRef(0);
  const currentId = useRef(routeId ?? '');
  const loadedRoute = useRef<string | null>(null);
  const draftCreation = useRef<{ version: number; promise: Promise<ConversationRow> } | null>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const scrolledToMatch = useRef('');

  const conversationId = conversation?.id ?? '';
  const focusUid = searchParams.get('m') ?? '';
  const focusQ = searchParams.get('q') ?? '';

  useEffect(() => () => { navigationVersion.current++; }, []);

  useEffect(() => {
    document.documentElement.lang = DEFAULT_UI_LANGUAGE;
  }, []);

  useEffect(() => phoneAi.subscribe(setAi), []);
  const [laya, setLaya] = useState<LayaState>({ status: 'idle', device: '', progress: '', error: '' });
  useEffect(() => phoneLaya.subscribe(setLaya), []);
  // Laya loads after Gemma is ready, so the two downloads and loads never hold the phone's memory at once.
  // After setup downloaded the AI, it loads from the phone's own storage at every start: no hub needed.
  useEffect(() => {
    const setup = loadSetup();
    if (setup?.ai === 'ready' && phoneAiFit() !== 'too-small') prepareModels(setup.hubUrl, setup.layaThreshold);
  }, []);

  const { data: storedMessages } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => questionsForConversation(conversationId),
    enabled: Boolean(conversationId),
  });
  const history = conversationId ? (storedMessages ?? []) : [];

  const refresh = useCallback(async (id = conversationId || loadActiveConversationId()) => {
    if (!id) return;
    await queryClient.invalidateQueries({ queryKey: ['conversation-messages', id] });
  }, [conversationId, queryClient]);

  // URL is source of truth: load :conversationId, or stay on draft `/chat` with no row.
  useEffect(() => {
    if (loadedRoute.current === (routeId ?? '')) return;
    const version = ++navigationVersion.current;
    const initialLoad = loadedRoute.current === null;
    loadedRoute.current = null;
    setRouteLoadFailed(false);
    if (!initialLoad) { setConversation(null); setText(''); setPhoto(null); }
    if (!routeId) {
      loadedRoute.current = '';
      currentId.current = '';
      saveActiveConversationId('');
      return;
    }
    let cancelled = false;
    void (async () => {
      let c: ConversationRow | null;
      try { c = await resolveConversation(routeId); }
      catch {
        if (!cancelled && version === navigationVersion.current) { setRouteLoadFailed(true); setNotice(L.chatLoadError); }
        return;
      }
      if (cancelled || version !== navigationVersion.current) return;
      loadedRoute.current = c?.id ?? '';
      currentId.current = c?.id ?? '';
      saveActiveConversationId(c?.id ?? '');
      setConversation(c);
      setPickerOpen(false);
      setNotice('');
      scrolledToMatch.current = '';
      if (c && c.id !== routeId) {
        // Keep ?m=&q= when normalizing the path so scroll-to-match still runs.
        navigate(`/chat/${c.id}${window.location.search}`, { replace: true });
      } else if (!c && routeId) {
        navigate('/chat', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeId, navigate, routeLoadKey]);

  const syncNow = useCallback(async (version = navigationVersion.current, id = currentId.current) => {
    const result = await syncQueue(hubUrl);
    setHubOnline(result.reachable);
    if (result.sent && version === navigationVersion.current) setNotice(L.hubSent(result.sent));
    await refresh(id);
  }, [hubUrl, refresh]);

  useEffect(() => {
    if (!hubUrl) return;
    void syncNow();
    const onOnline = () => void syncNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [hubUrl, syncNow]);

  const messages = history.concat(unsaved.filter((u) => u.conversationId === conversationId));

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => mainRef.current,
    estimateSize: () => 240,
    overscan: 3,
  });

  useEffect(() => {
    if (focusUid) {
      setHighlightUid(focusUid);
      setHighlightNeedle(focusQ);
    }
  }, [focusUid, focusQ]);

  useEffect(() => {
    if (!focusUid || messages.length === 0) return;
    const key = `${conversationId}:${focusUid}`;
    if (scrolledToMatch.current === key) return;
    const index = messages.findIndex((m) => m.uid === focusUid);
    if (index < 0) return;
    scrolledToMatch.current = key;
    requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(index, { align: 'center' });
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('m');
          next.delete('q');
          return next;
        },
        { replace: true },
      );
    });
  }, [focusUid, messages, conversationId, rowVirtualizer, setSearchParams]);

  const lastKey = `${messages.length}:${messages[messages.length - 1]?.explanation ?? ''}:${messages[messages.length - 1]?.hubMatchIds?.join() ?? ''}:${busyId}`;
  useEffect(() => {
    if (highlightUid || focusUid) return;
    endOfChat.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [lastKey, highlightUid, focusUid]);

  function selectConversation(c: ConversationRow) {
    setRouteLoadFailed(false);
    navigationVersion.current++;
    currentId.current = c.id;
    loadedRoute.current = c.id;
    sidebar.closeOnMobile();
    saveActiveConversationId(c.id);
    setConversation(c);
    setText('');
    setPhoto(null);
    setPickerOpen(false);
    setNotice(unsaved.some(row => row.conversationId === c.id) ? L.saveError : '');
    if (c.id !== routeId) {
      navigate(`/chat/${c.id}`);
    }
  }

  function newChat() {
    setRouteLoadFailed(false);
    navigationVersion.current++;
    currentId.current = '';
    loadedRoute.current = '';
    sidebar.closeOnMobile();
    saveActiveConversationId('');
    setConversation(null);
    setUnsaved(rows => rows.filter(row => row.conversationId !== conversationId));
    setText('');
    setPhoto(null);
    setPickerOpen(false);
    setNotice('');
    setHighlightUid('');
    setHighlightNeedle('');
    navigate('/chat');
    setListKey((k) => k + 1);
    requestAnimationFrame(() => document.getElementById('ugatan-question')?.focus());
  }

  function requestNavigation(proceed: () => void) {
    if (text.trim() || photo || unsaved.some(row => row.conversationId === conversationId)) {
      pendingNavigation.current = proceed;
      draftDialog.current?.showModal();
    } else proceed();
  }

  function openSearch() {
    navigationVersion.current++;
    sidebar.closeOnMobile();
    navigate('/search');
  }

  async function ask(question: string, symptomId?: string, image?: string) {
    if (routeId && loadedRoute.current !== routeId) { setNotice(routeLoadFailed ? L.chatLoadError : L.chatLoading); return; }
    const version = navigationVersion.current;
    const stillHere = () => version === navigationVersion.current;
    let active = conversation;
    if (!active) {
      try {
        if (draftCreation.current?.version !== version) draftCreation.current = { version, promise: createLocalConversation('Bagong usapan') };
        active = await draftCreation.current.promise;
      } catch {
        if (draftCreation.current?.version === version) draftCreation.current = null;
        if (stillHere()) {
          setNotice(L.saveError);
          setText(current => [question, current].filter(Boolean).join('\n'));
          setPhoto(current => current ?? image ?? null);
        }
        return;
      }
      if (stillHere()) {
        currentId.current = active.id;
        loadedRoute.current = active.id;
        setConversation(active);
        saveActiveConversationId(active.id);
        navigate(`/chat/${active.id}`);
      }
      setListKey((k) => k + 1);
    }
    if (stillHere()) { setHighlightUid(''); setHighlightNeedle(''); setNotice(''); setPickerOpen(false); }
    const trimmed = question.trim().slice(0, MAX_QUESTION_CHARS);

    // Matching reads everything the farmer has said in this chat, not only this message.
    // A clear match closes a problem, so the next sign is matched on its own, not mixed with one already answered.
    let lastClear = messages.length - 1;
    while (lastClear >= 0 && outcomeOf(messages[lastClear]!) !== 'clear') lastClear--;
    const earlier = messages.slice(lastClear + 1).map((m) => m.text);
    const picked = symptomId ? KNOWLEDGE_BY_ID.get(symptomId) : undefined;
    // Mirror hub: injection never goes to matching or the phone model, even with a tapped symptom.
    const plan: Plan = isInjectionAttempt(trimmed)
      ? { route: 'chat', description: trimmed, notes: [], crop: 'any', entries: [], clear: false, matchedOn: [] }
      : picked
        ? { route: 'match', description: trimmed, notes: [], crop: 'any', entries: [picked], clear: true, matchedOn: [] }
        : planFor(trimmed, earlier);

    const followUps = messages.reduce((n, r) => nextFollowUps(n, outcomeOf(r)), 0);
    const final = isFinalAnswer(followUps);
    // The last few turns, as the farmer saw them, so the model answers what the farmer is saying now.
    const turns = messages.slice(-HISTORY_TURNS).map(turnOf).map(clipTurn);
    const record: QueuedQuestion = {
      uid: newId(),
      crop: CROP,
      text: trimmed,
      history: turns,
      symptomId,
      ...(image ? { image } : {}),
      sessionId: active.sessionId,
      conversationId: active.id,
      route: plan.route,
      createdAt: new Date().toISOString(),
      status: 'queued',
      matchIds: plan.entries.map((e) => e.id),
      clear: plan.clear,
      matchedOn: plan.matchedOn,
    };
    let id: number | undefined;
    try {
      id = await db.transaction('rw', db.conversations, db.questions, async () => {
        if (!await db.conversations.get(active.id)) return undefined;
        return db.questions.add(record);
      });
    } catch {
      if (stillHere()) setNotice(L.saveError);
      setUnsaved((u) => [...u, record]);
    }
    if (id !== undefined && messages.length === 0 && active.title === 'Bagong usapan') {
      const title = trimmed.slice(0, 48);
      try {
        await renameConversation(active.id, title);
        if (stillHere() && currentId.current === active.id) setConversation({ ...active, title });
        setListKey((k) => k + 1);
      } catch { /* The saved question remains usable with its existing chat title. */ }
    }
    await refresh(active.id);

    // Hub premises: ONNX on the browser / hub Q4_0+ONNX multimodal. Away: LiteRT on the phone when native.
    const online = Boolean(hubUrl && (await hubReachable(hubUrl)));
    const route = resolveAiRoute({ hubOnline: online, native: NATIVE_AI });
    const useHub = preferHubAsk(route, Boolean(image), phoneAi.ready);

    if (!useHub && phoneAi.ready && id !== undefined) {
      if (stillHere()) setBusyId(id);
      try {
        // The problem the app last named in this chat, so "ano ang gagawin ko?" is answered from its notes.
        const named = lastClear >= 0 ? matchOf(messages[lastClear]!).entries[0] : undefined;
        await answerOnPhone(id, { conversationId: active.id, text: trimmed, plan, picked, image, turns, final, followUps, named });
      } catch (err) {
        if (stillHere()) setNotice(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(current => current === id ? null : current);
      }
    } else if (useHub && hubUrl) {
      if (id !== undefined && stillHere()) setBusyId(id);
      try {
        await syncNow(version, active.id);
      } catch {
        if (stillHere()) setNotice(L.aiRequestError);
      } finally {
        setBusyId(current => current === id ? null : current);
      }
    }
    await refresh(active.id);
    setListKey((k) => k + 1);
  }

  /**
   * The hub's answer steps (hub/src/answer.ts), on the phone. 1. A photo is read and adds its signs to the words.
   * 2. The matcher decides the problem and whether it is sure: keyword, then Gemma's English, then Laya. 3. Gemma
   * explains that decision, or, with nothing matched, replies to the chat and asks what the farmer sees.
   */
  async function answerOnPhone(
    id: number,
    q: {
      conversationId: string;
      text: string;
      plan: Plan;
      picked?: KnowledgeEntry;
      image?: string;
      turns: ChatTurn[];
      final: boolean;
      followUps: number;
      named?: KnowledgeEntry;
    },
  ) {
    const { text, plan, picked, image, turns, final, followUps } = q;
    // The named problem is about one crop. A message that names the other crop is not about it.
    const named = q.named && (detectCrop(text) ?? q.named.crop) === q.named.crop ? q.named : undefined;
    const injection = isInjectionAttempt(text);
    // A tapped picture already is the pick, and a message that tries to change the rules is never matched, so
    // neither has its photo read.
    let photo: PhotoRead | null = null;
    if (image && !picked && !injection) {
      photo = await readPhotoOnPhone(image, text, plan.crop);
      await db.questions.update(id, { photo: photo.status, photoSigns: photo.signs });
      await refresh(q.conversationId);
    }
    const asked = photo?.status === 'ok' ? `${plan.description.replace(/[.\s]+$/, '')}. ${photo.signs}` : plan.description;
    // The chat reply hears the photo as a marked English note, so it answers in the farmer's language.
    const said =
      photo?.status === 'ok'
        ? `${text} [The farmer's photo shows, in the app's English: ${photo.signs}]`
        : photo?.status === 'not-plant'
          ? `${text} [The farmer sent a photo, but it does not show rice or corn.]`
          : photo?.status === 'no-signs'
            ? `${text} [The farmer sent a photo, but it shows no clear sign of a problem.]`
            : text;
    const photoShowedNothing = photo?.status === 'not-plant' || photo?.status === 'no-signs';
    let route: Route = injection
      ? 'chat'
      : picked || photo?.status === 'ok'
        ? 'match'
        : photoShowedNothing && !hasSign(asked)
          ? 'chat'
          : plan.route;
    // A how-to about growing palay is answered from its guide. "Ano po ang gagawin ko?" while a problem is still
    // open gets the likely problem's first steps, matched on the open notes, instead of one more question.
    let guide = route === 'chat' && !injection && !picked && photo?.status !== 'ok' ? careGuideFor(text, hasSign(text)) : null;
    const help =
      !guide && !injection && !picked && !named && photo?.status !== 'ok' && plan.notes.length > 0 && !hasSign(text) && isHelpAsk(text) && fixedReply(text) === null;
    if (help) route = 'match';
    const matchText = help ? sessionText(plan.notes) : asked;

    let entries = plan.entries;
    let clear = plan.clear;
    let matchedOn = plan.matchedOn;
    if (route === 'match' && !picked) {
      const outcome = await matchOnPhone(matchText, plan.crop, {
        knowledge: KNOWLEDGE,
        describe: describeOnPhone,
        ...(phoneLaya.ready ? { laya: (t: string, c: Crop | 'any') => phoneLaya.match(t, c, KNOWLEDGE) } : {}),
      });
      if (outcome.noSigns) route = 'chat';
      clear = outcome.clear;
      // A match that is not sure keeps only the problems that show where the farmer saw it.
      entries = clear ? entriesFor(outcome.ids) : fitPlantPart(entriesFor(outcome.ids), matchText);
      matchedOn = outcome.matchedOn;
      // A photo alone is sure only with two picked signs for the problem, as on the hub.
      const photoOnly = photo?.status === 'ok' && !hasSign(plan.description);
      if (photoOnly && clear && photo?.picks && !photoIsSure(outcome.ids[0]!, photo.picks, KNOWLEDGE)) clear = false;
      // Asked for help with nothing matched yet: the field-check steps.
      if (help && entries.length === 0) {
        route = 'chat';
        guide = SCOUTING_GUIDE;
      }
      await db.questions.update(id, {
        route,
        matchIds: entries.map((e) => e.id),
        clear,
        matchedOn,
        matcher: phoneLaya.ready ? 'hybrid' : 'keyword',
      });
      await refresh(q.conversationId);
    }

    const bestGuess = route === 'match' && entries.length > 0 && !clear && final;
    if (route === 'match' && entries.length > 0) {
      // The matcher decided the problem. The phone model only explains it, and is told when the match is not sure.
      const given = notesToExplain(entries, clear || bestGuess);
      const unsure = !clear && !bestGuess;
      const generated = await phoneAi.generate(
        buildMessages(matchText, CROP, given, {
          sure: clear,
          bestGuess,
          history: turns,
          ...(unsure && photo?.status !== 'ok' && !help ? { askChoices: signChoices(entries, matchText, followUps) } : {}),
          ...(unsure && help ? { help } : {}),
        }),
        { maxNewTokens: 320 },
      );
      // A question the app already asked in this chat is dropped, so the farmer is never asked the same thing twice.
      const earlierReplies = turns.map((t) => t.reply);
      const lang = replyLanguage(text);
      // The output rail: a reply that names a problem it was not given notes for is dropped, and the curated notes show instead.
      const grounded = generated !== null && ungroundedProblems(generated, KNOWLEDGE, given, text).length > 0 ? null : generated;
      const tidied =
        grounded === null
          ? null
          : clear || bestGuess
            ? withProblemName(tidyReply(dropRepeatedQuestions(grounded, earlierReplies), text), entries[0]!.name, clear, lang)
            : tidyReply(dropRepeatedQuestions(grounded, earlierReplies), text);
      // Prompt leaks (persona / system text) become INJECTION_REPLY.
      const raw = tidied === null ? null : guardPromptLeak(tidied);
      await db.questions.update(id, {
        status: 'answered',
        // A sure match or a best guess always says the problem's name.
        explanation: raw,
        explanationStatus: raw === null ? 'blocked' : 'phone',
        answeredAt: new Date().toISOString(),
      });
      return;
    }
    // Nothing to explain: the phone model replies to the whole chat and asks what they see.
    // A pesticide, health, other-crop, or "who are you" message gets the app's fixed line, never the model's.
    const fixed = route === 'chat' ? fixedReply(text) : null;
    const unmatched = route === 'match';
    const generated =
      fixed ??
      (await phoneAi.generate(
        buildChatMessages(said, turns, undefined, {
          notes: plan.notes,
          unmatched,
          final: unmatched && final,
          crop: plan.crop,
          ...(named ? { diagnosis: named } : {}),
          ...(guide ? { guide } : {}),
        }),
        // Steps from a guide or from the named problem's notes need room for a numbered list.
        { maxNewTokens: guide || named ? 420 : 200 },
      ));
    // A chat reply may name only the problem the app already named; a guide's own words are not the model's guess.
    const grounded =
      generated !== null &&
      ungroundedProblems(generated, KNOWLEDGE, named ? [named] : [], guide ? `${text} ${guide.steps.join(' ')}` : text).length > 0
        ? null
        : generated;
    const tidied = grounded === null || fixed ? grounded : tidyReply(dropRepeatedQuestions(grounded, turns.map((t) => t.reply)), text, guide ? { urgent: false } : {});
    // With the model's words blocked, a guide question still gets the guide's own steps.
    const raw = tidied === null ? (guide ? guideReply(guide, replyLanguage(text)) : null) : guardPromptLeak(tidied);
    await db.questions.update(id, {
      status: 'answered',
      explanation: raw,
      explanationStatus: raw === null ? 'blocked' : 'phone',
      answeredAt: new Date().toISOString(),
    });
  }

  function submit() {
    if (routeId && loadedRoute.current !== routeId) { setNotice(routeLoadFailed ? L.chatLoadError : L.chatLoading); return; }
    const typed = text.trim();
    if (!typed && !photo) return;
    const image = photo ?? undefined;
    setText('');
    setPhoto(null);
    void ask(typed || L.photoDefaultText, undefined, image);
  }

  async function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    const version = navigationVersion.current;
    try {
      const next = await shrinkPhoto(file);
      if (version !== navigationVersion.current) return;
      setPhoto(next);
      setNotice('');
    } catch {
      if (version === navigationVersion.current) notify({ title: L.photoButton, description: L.photoError, type: 'error' });
    }
  }

  /** Voice progress stays inline; voice problems show as a toast. */
  function voiceNotice(message: string) {
    if (voiceNoticeIsInline(message, L)) setNotice(message);
    else {
      setNotice('');
      notify({ title: L.voiceStart, description: message, type: 'error' });
    }
  }

  function onSymptom(entry: KnowledgeEntry) {
    const tile = symptomTile(entry.id);
    void ask(tile.labelTl || entry.name, entry.id);
  }

  const empty = messages.length === 0;

  const aiFit = phoneAiFit();

  /** Downloading the AI is the setup screen's job: it checks the hub's Wi-Fi first and ends with a success alert. */
  function prepareAi() {
    if (aiFit === 'too-small') return;
    helpDialog.current?.close();
    navigate('/setup');
  }

  const thread = empty ? null : (
    <div>
      <h1 className="sr-only">{L.appName}</h1>
      <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const r = messages[vi.index]!;
          const { entries, clear, matchedOn } = matchOf(r);
          const highlight = highlightUid === r.uid ? highlightNeedle : '';
          return (
            <div
              key={r.uid}
              data-index={vi.index}
              data-msg-uid={r.uid}
              ref={rowVirtualizer.measureElement}
              className="absolute top-0 left-0 w-full pb-8"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <div className="grid gap-6">
                <div className="flex justify-end">
                  <div className="grid max-w-[85%] justify-items-end gap-2">
                    {r.image && (
                      <img src={photoSrc(r.image)} alt={L.photoPreview} className="block max-h-56 w-auto max-w-full rounded-2xl border border-line object-cover" />
                    )}
                    <p className="m-0 whitespace-pre-wrap rounded-3xl rounded-br-lg bg-leaf-soft px-5 py-3 text-base leading-7">
                      {highlight ? <HighlightedText text={r.text} needle={highlight} /> : r.text}
                    </p>
                  </div>
                </div>
                <PhotoNote r={r} reading={busyId !== null && busyId === r.id} />
                <AnswerView
                  labels={L}
                  language={DEFAULT_UI_LANGUAGE}
                  matches={entries}
                  clear={clear}
                  matchedOn={matchedOn}
                  explanation={r.explanation}
                  explanationStatus={r.explanationStatus}
                  waitingForHub={r.status === 'queued' && !phoneAi.ready && busyId !== r.id}
                  thinking={busyId !== null && busyId === r.id}
                  fallback={r.route === 'chat' ? smallTalkReply(r.text) : undefined}
                  highlightNeedle={highlight}
                  // Only the newest answer offers follow-ups, and not while a reply is being written.
                  onFollowUp={vi.index === messages.length - 1 && busyId === null ? (question) => void ask(question) : undefined}
                  onRequestPhoto={() => setPhotoRequest((n) => n + 1)}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div ref={endOfChat} />
    </div>
  );

  return (
    <div className="relative flex h-dvh">
      <Suspense fallback={null}>
        <ConversationSidebar
          open={sidebar.open}
          desktop={sidebar.desktop}
          activeId={conversationId}
          labels={L}
          onToggle={sidebar.toggle}
          onSelect={chat => requestNavigation(() => selectConversation(chat))}
          onNewChat={() => requestNavigation(newChat)}
          onSearch={() => requestNavigation(openSearch)}
          onDeleted={async (id) => {
            const version = navigationVersion.current;
            if (id === currentId.current) {
              const next = await ensureActiveConversation().catch(() => null);
              if (version === navigationVersion.current && id === currentId.current) {
                if (next) selectConversation(next);
                else newChat();
              }
            }
            setListKey((k) => k + 1);
            void queryClient.invalidateQueries({ queryKey: ['chat-search'] });
            void queryClient.invalidateQueries({ queryKey: ['chat-search-recent'] });
          }}
          refreshKey={listKey}
        />
      </Suspense>

      <div className="min-w-0 flex-1">
        <HomePage
          labels={L}
          sidebarOpen={sidebar.open}
          sidebarDesktop={sidebar.desktop}
          text={text}
          notice={notice}
          hubUrl={hubUrl}
          photo={photo}
          mainRef={mainRef}
          suggestions={empty ? <SymptomPicker labels={L} onPick={onSymptom} /> : undefined}
          tray={routeLoadFailed ? <button type='button' className='pill-btn min-h-12' onClick={() => setRouteLoadKey(key => key + 1)}>{L.chatRetryLabel}</button> : !empty && pickerOpen ? <SymptomPicker labels={L} onPick={onSymptom} compact /> : undefined}
          symptomsOpen={pickerOpen}
          photoRequest={photoRequest}
          onSymptoms={empty ? undefined : () => setPickerOpen((open) => !open)}
          onTextChange={setText}
          onSubmit={submit}
          onHistory={sidebar.toggle}
          onHelp={() => helpDialog.current?.showModal()}
          onNewConversation={() => requestNavigation(newChat)}
          onPhotoFile={(file) => void onPhotoChosen(file)}
          onRemovePhoto={() => setPhoto(null)}
          onNotice={voiceNotice}
        >
          {thread}
        </HomePage>
      </div>
      <HelpDialog ref={helpDialog} ai={ai} laya={laya} fit={aiFit} onPrepareAi={prepareAi} />
      <ConfirmDialog
        ref={draftDialog}
        copy={{ title: L.newChatConfirmTitle, body: L.newChatConfirmBody, confirm: L.newChatConfirmYes, cancel: L.newChatConfirmNo }}
        onConfirm={() => {
          const proceed = pendingNavigation.current;
          pendingNavigation.current = null;
          setUnsaved(rows => rows.filter(row => row.conversationId !== conversationId));
          proceed?.();
        }}
      />
    </div>
  );
}
