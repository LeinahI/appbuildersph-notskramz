import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildMessages,
  matchKeywords,
  notesToExplain,
  type KnowledgeEntry,
} from '@ugatan/shared';
import { AnswerView } from './components/AnswerView';
import { HomePage } from './components/HomePage';
import { HelpDialog } from './components/HelpDialog';
import { QueueList } from './components/QueueList';
import { KNOWLEDGE } from './config/knowledge';
import { DEFAULT_UI_LANGUAGE, L, localeFor } from './config/labels';
import { loadHubUrl } from './config/hub';
import { db, newId, type QueuedQuestion } from './lib/db';
import { phoneAi, type PhoneAiState } from './lib/llm';
import { hubReachable, syncQueue } from './lib/sync';

interface Current {
  id?: number;
  text: string;
  entries: KnowledgeEntry[];
  clear: boolean;
}

export default function App() {
  const crop = 'any' as const;
  const [text, setText] = useState('');
  const [conversationKey, setConversationKey] = useState(0);
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<QueuedQuestion[]>([]);
  const [hubUrl] = useState(loadHubUrl);
  const [notice, setNotice] = useState('');
  const [currentRecord, setCurrentRecord] = useState<QueuedQuestion | null>(null);
  const historyDialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const labels = L;
  const locale = localeFor(DEFAULT_UI_LANGUAGE);
  const refresh = useCallback(async () => {
    try {
      const recent = await db.questions.orderBy('id').reverse().limit(20).toArray();
      setHistory(recent);
      if (current?.id !== undefined) {
        setCurrentRecord((await db.questions.get(current.id)) ?? null);
      }
    } catch {
      // IndexedDB can be blocked. The immediate offline answer still works.
    }
  }, [current?.id]);


  useEffect(() => {
    document.documentElement.lang = DEFAULT_UI_LANGUAGE;
  }, []);

  useEffect(() => phoneAi.subscribe(setAi), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    await syncQueue(hubUrl);
    await refresh();
  }, [hubUrl, refresh]);

  useEffect(() => {
    if (!hubUrl) return;
    void syncNow();
    const onOnline = () => void syncNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [hubUrl, syncNow]);

  async function ask(question: string, entries: KnowledgeEntry[], clear: boolean) {
    const trimmed = question.trim();
    setCurrent({ text: trimmed, entries, clear });
    setCurrentRecord(null);
    setNotice('');

    let id: number | undefined;
    try {
      id = await db.questions.add({
        uid: newId(),
        crop,
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: 'queued',
        matchIds: entries.map((entry) => entry.id),
        clear,
      });
    } catch {
      setNotice(labels.saveError);
    }
    setCurrent((value) => (value ? { ...value, id } : value));

    if (phoneAi.ready && id !== undefined) {
      try {
        const raw = await phoneAi.generate(
          buildMessages(trimmed, crop, notesToExplain(entries, clear), { sure: clear }),
        );
        await db.questions.update(id, {
          status: 'answered',
          explanation: raw,
          explanationStatus: raw === null ? 'blocked' : 'phone',
          answeredAt: new Date().toISOString(),
        });
      } catch {
        setNotice(labels.aiRequestError);
      }
    } else if (hubUrl && (await hubReachable(hubUrl))) {
      await syncNow();
    }
    await refresh();
  }
  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setText('');
    const result = matchKeywords(trimmed, crop, KNOWLEDGE);
    void ask(
      trimmed,
      result.matches.map((match) => match.entry),
      result.clear,
    );
  }

  function newConversation() {
    setConversationKey((value) => value + 1);
    setText('');
    setCurrent(null);
    setCurrentRecord(null);
    setNotice('');
  }

  function showHistory() {
    historyDialog.current?.showModal();
  }

  function prepareAi() {
    try {
      phoneAi.load();
    } catch {
      setAi({ status: 'error', device: '', progress: '', error: '' });
    }
  }

  const explanation = currentRecord?.explanation ?? null;
  const explanationStatus = currentRecord?.explanationStatus;
  const waitingForHub = !!currentRecord && currentRecord.status === 'queued' && !phoneAi.ready;
  const currentEntries = current?.entries ?? [];
  const answer = current ? (
    <div className='grid gap-6'>
      <h1 className='sr-only'>{labels.appName}</h1>
      <p className='m-0 ml-auto max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-leaf-soft px-5 py-3 text-base leading-7'>
        {current.text}
      </p>
      <section>
        <h2 className='mt-0 mb-4 text-lg font-semibold'>{labels.matchesHeading}</h2>
        <AnswerView
          matches={currentEntries}
          clear={current.clear}
          labels={labels}
          explanation={explanation}
          explanationStatus={explanationStatus}
          waitingForHub={waitingForHub}
        />
      </section>
    </div>
  ) : null;

  return (
    <>
      <HomePage
        key={conversationKey}
        labels={labels}
        text={text}
        notice={notice}
        onTextChange={setText}
        onSubmit={() => submitQuestion(text)}
        onHistory={showHistory}
        onHelp={() => helpDialog.current?.showModal()}
        onNewConversation={newConversation}
        onPhoto={() => setNotice(labels.photoUnavailable)}
        onNotice={setNotice}
      >
        {answer}
      </HomePage>
      <HelpDialog ref={helpDialog} ai={ai} onPrepareAi={prepareAi} />
      <dialog ref={historyDialog} className='chat-history' aria-labelledby='ugatan-history-heading'>
        <div className='mb-4 flex items-center justify-between gap-4'>
          <h2 id='ugatan-history-heading' className='m-0 text-xl font-semibold'>{labels.historyLabel}</h2>
          <button
            type='button'
            className='chat-icon-button'
            aria-label={labels.closeHistory}
            title={labels.closeHistory}
            onClick={() => historyDialog.current?.close()}
          >
            <svg className='size-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' aria-hidden='true'>
              <path d='m6 6 12 12M6 18 18 6' />
            </svg>
          </button>
        </div>
        <QueueList items={history} labels={labels} locale={locale} />
      </dialog>
    </>
  );
}
