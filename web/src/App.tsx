import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildMessages,
  matchKeywords,
  notesToExplain,
  type KnowledgeEntry,
} from '@ugatan/shared';
import { AnswerView } from './components/AnswerView';
import { HomePage } from './components/HomePage';
import { notify } from './components/ToastHost';
import { HelpDialog } from './components/HelpDialog';
import { ConversationDialog } from './components/ConversationDialog';
import { KNOWLEDGE, KNOWLEDGE_BY_ID } from './config/knowledge';
import { DEFAULT_UI_LANGUAGE, L, localeFor } from './config/labels';
import { loadHubUrl } from './config/hub';
import { db, newId, type QueuedQuestion } from './lib/db';
import { phoneAi, type PhoneAiState } from './lib/llm';
import { hubReachable, syncQueue } from './lib/sync';

interface Current {
  uid: string;
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
  const activeQuestion = useRef<string | null>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const [ai, setAi] = useState<PhoneAiState>({ status: 'idle', device: '', progress: '', error: '' });
  const labels = L;
  const locale = localeFor(DEFAULT_UI_LANGUAGE);
  const refresh = useCallback(async () => {
    try {
      const recent = await db.questions.orderBy('id').reverse().limit(20).toArray();
      setHistory(recent);
      if (current?.id !== undefined) {
        const record = (await db.questions.get(current.id)) ?? null;
        if (activeQuestion.current === current.uid) setCurrentRecord(record);
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
    const uid = newId();
    activeQuestion.current = uid;
    setCurrent({ uid, text: trimmed, entries, clear });
    setCurrentRecord(null);
    setNotice('');

    let id: number | undefined;
    try {
      id = await db.questions.add({
        uid,
        crop,
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: 'queued',
        matchIds: entries.map((entry) => entry.id),
        clear,
      });
    } catch {
      if (activeQuestion.current === uid) setNotice(labels.saveError);
    }
    setCurrent((value) => (value?.uid === uid ? { ...value, id } : value));

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
        if (activeQuestion.current === uid) setNotice(labels.aiRequestError);
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
    activeQuestion.current = null;
    setConversationKey((value) => value + 1);
    setText('');
    setCurrent(null);
    setCurrentRecord(null);
    setNotice('');
    closeHistoryAndFocus();
  }

  function openConversation(record: QueuedQuestion) {
    activeQuestion.current = record.uid;
    setConversationKey((value) => value + 1);
    setText('');
    setNotice('');
    setCurrent({
      uid: record.uid,
      id: record.id,
      text: record.text,
      entries: record.matchIds.flatMap((id) => {
        const entry = KNOWLEDGE_BY_ID.get(id);
        return entry ? [entry] : [];
      }),
      clear: record.clear,
    });
    setCurrentRecord(record);
    closeHistoryAndFocus();
  }

  function closeHistoryAndFocus() {
    historyDialog.current?.close();
    requestAnimationFrame(() => document.getElementById('ugatan-question')?.focus());
  }

  function showHistory() {
    void refresh();
    historyDialog.current?.showModal();
  }

  function prepareAi() {
    try {
      phoneAi.load();
    } catch {
      setAi({ status: 'error', device: '', progress: '', error: '' });
    }
  }

  function voiceNotice(message: string) {
    if (!message || message === labels.voiceListening) setNotice(message);
    else {
      setNotice('');
      notify({ title: labels.voiceStart, description: message, type: 'error' });
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
        onNewConversation={showHistory}
        onPhoto={() => notify({ title: labels.photoButton, description: labels.photoUnavailable })}
        onNotice={voiceNotice}
      >
        {answer}
      </HomePage>
      <HelpDialog ref={helpDialog} ai={ai} onPrepareAi={prepareAi} />
      <ConversationDialog
        ref={historyDialog}
        items={history}
        labels={labels}
        locale={locale}
        onNewConversation={newConversation}
        onSelect={openConversation}
      />
    </>
  );
}
