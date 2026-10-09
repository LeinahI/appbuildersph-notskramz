import { useCallback, useEffect, useState } from 'react';
import {
  buildMessages,
  matchKeywords,
  type Crop,
  type KnowledgeEntry,
} from '@ugatan/shared';
import { AnswerView } from './components/AnswerView';
import { QueueList } from './components/QueueList';
import { SymptomPicker } from './components/SymptomPicker';
import { KNOWLEDGE } from './config/knowledge';
import { L } from './config/labels';
import { PHONE_MODEL } from './config/models';
import { DEFAULT_HUB_URL, loadHubUrl, saveHubUrl } from './config/hub';
import { db, newId, type QueuedQuestion } from './lib/db';
import { phoneAi, type PhoneAiState } from './lib/llm';
import { hubReachable, syncQueue } from './lib/sync';
import { symptomTile } from './symptoms';

interface Current {
  id?: number;
  text: string;
  entries: KnowledgeEntry[];
  clear: boolean;
}

export default function App() {
  const [crop, setCrop] = useState<Crop | 'any'>('rice');
  const [text, setText] = useState('');
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<QueuedQuestion[]>([]);
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const [hubUrl, setHubUrl] = useState(loadHubUrl);
  const [hubOnline, setHubOnline] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [currentRecord, setCurrentRecord] = useState<QueuedQuestion | null>(null);

  const refresh = useCallback(async () => {
    try {
      const recent = await db.questions.orderBy('id').reverse().limit(20).toArray();
      setHistory(recent);
      if (current?.id !== undefined) {
        setCurrentRecord((await db.questions.get(current.id)) ?? null);
      }
    } catch {
      // IndexedDB blocked. The offline answer still shows.
    }
  }, [current?.id]);

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

  async function ask(question: string, entries: KnowledgeEntry[], clear: boolean, symptomId?: string) {
    const trimmed = question.trim();
    setCurrent({ text: trimmed, entries, clear });
    setNotice('');

    let id: number | undefined;
    try {
      id = await db.questions.add({
        uid: newId(),
        crop,
        text: trimmed,
        symptomId,
        createdAt: new Date().toISOString(),
        status: 'queued',
        matchIds: entries.map((e) => e.id),
        clear,
      });
    } catch {
      setNotice(L.saveError);
    }
    setCurrent((c) => (c ? { ...c, id } : c));

    // Phone AI, if the farmer prepared it. Otherwise the question waits for the hub.
    if (phoneAi.ready && id !== undefined) {
      try {
        const raw = await phoneAi.generate(buildMessages(trimmed, crop, entries));
        await db.questions.update(id, {
          status: 'answered',
          explanation: raw,
          explanationStatus: raw === null ? 'blocked' : 'phone',
          answeredAt: new Date().toISOString(),
        });
      } catch (err) {
        setNotice(err instanceof Error ? err.message : String(err));
      }
    } else if (hubUrl && (await hubReachable(hubUrl))) {
      await syncNow();
    }
    await refresh();
  }

  function onLook() {
    const result = matchKeywords(text, crop, KNOWLEDGE);
    void ask(
      text,
      result.matches.map((m) => m.entry),
      result.clear,
    );
  }

  function onSymptom(entry: KnowledgeEntry) {
    const tile = symptomTile(entry.id);
    void ask(tile.labelTl || entry.name, [entry], true, entry.id);
  }

  const record = currentRecord;
  const explanation = record?.explanation ?? null;
  const explanationStatus = record?.explanationStatus;
  const waitingForHub = !!record && record.status === 'queued' && !phoneAi.ready;
  const currentEntries = current?.entries ?? [];
  const aiLabel =
    ai.status === 'idle'
      ? L.phoneAiIdle
      : ai.status === 'loading'
        ? L.phoneAiLoading
        : ai.status === 'ready'
          ? L.phoneAiReady
          : L.phoneAiError;

  return (
    <main className="wrap">
      <header>
        <h1>{L.appName}</h1>
        <p className="tag">{L.tagline}</p>
      </header>

      <section className="card">
        <label>
          {L.crop}
          <select value={crop} onChange={(e) => setCrop(e.target.value as Crop | 'any')}>
            <option value="rice">{L.cropRice}</option>
            <option value="corn">{L.cropCorn}</option>
            <option value="any">{L.cropAny}</option>
          </select>
        </label>

        <label>
          {L.describe}
          <textarea rows={4} value={text} placeholder={L.describePlaceholder} onChange={(e) => setText(e.target.value)} />
        </label>

        <button onClick={onLook} disabled={!text.trim()}>
          {L.look}
        </button>

        <SymptomPicker crop={crop} onPick={onSymptom} />
      </section>

      {current && (
        <section className="card">
          <h2>{L.matchesHeading}</h2>
          <AnswerView
            matches={currentEntries}
            clear={current.clear}
            explanation={explanation}
            explanationStatus={explanationStatus}
            waitingForHub={waitingForHub}
          />
          {notice && <p className="muted small">{notice}</p>}
        </section>
      )}

      <section className="card model">
        <div>
          <strong>{L.phoneAiHeading}:</strong> {aiLabel}
          {ai.progress && <div className="muted small">{ai.progress}</div>}
          {ai.status === 'ready' && (
            <div className="muted small">
              {L.phoneAiDevice} {ai.device}. {PHONE_MODEL.id.split('/')[1]}
            </div>
          )}
          {ai.status === 'error' && <div className="muted small">{ai.error}</div>}
        </div>
        {(ai.status === 'idle' || ai.status === 'error') && (
          <button className="secondary" onClick={() => phoneAi.load()}>
            {L.phoneAiPrepare}
          </button>
        )}
      </section>

      <section className="card">
        <h2>{L.hubHeading}</h2>
        <label>
          {L.hubUrlLabel}
          <input
            type="url"
            inputMode="url"
            placeholder={DEFAULT_HUB_URL || 'http://192.168.1.10:8787'}
            defaultValue={hubUrl}
            onBlur={(e) => {
              saveHubUrl(e.target.value);
              setHubUrl(e.target.value.trim().replace(/\/+$/, ''));
            }}
          />
        </label>
        {hubUrl && hubOnline !== null && (
          <p className="small">{hubOnline ? L.hubOnline : L.hubOffline}</p>
        )}
        <button className="secondary" onClick={() => void syncNow()} disabled={!hubUrl}>
          {L.hubSyncNow}
        </button>
      </section>

      <section className="card">
        <h2>{L.queueHeading}</h2>
        <QueueList items={history} />
      </section>

      <footer className="muted small">{L.footer}</footer>
    </main>
  );
}
