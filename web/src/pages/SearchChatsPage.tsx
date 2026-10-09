import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HighlightedText } from '../components/HighlightedText';
import { DEFAULT_UI_LANGUAGE, L, localeFor } from '../config/labels';
import { ensureActiveConversation, saveActiveConversationId } from '../lib/conversations';
import type { ConversationRow } from '../lib/db';
import {
  formatChatDate,
  listRecentConversations,
  searchChatHits,
  type ChatSearchHit,
} from '../lib/search-chats';

const ConversationSidebar = lazy(() => import('../components/ConversationSidebar'));

const SIDEBAR_KEY = 'ugatan.sidebarOpen';

export default function SearchChatsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [listKey, setListKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = localeFor(DEFAULT_UI_LANGUAGE);
  const needle = q.trim();

  useEffect(() => {
    document.documentElement.lang = DEFAULT_UI_LANGUAGE;
    inputRef.current?.focus();
  }, []);

  const recentQuery = useQuery({
    queryKey: ['chat-search-recent', listKey],
    queryFn: listRecentConversations,
    enabled: !needle,
  });

  const hitsQuery = useQuery({
    queryKey: ['chat-search', needle, listKey],
    queryFn: () => searchChatHits(needle),
    enabled: Boolean(needle),
  });

  const recent = recentQuery.data ?? [];
  const hits = hitsQuery.data ?? [];
  const rows: Array<{ kind: 'recent'; row: ConversationRow } | { kind: 'hit'; hit: ChatSearchHit }> = needle
    ? hits.map((hit) => ({ kind: 'hit' as const, hit }))
    : recent.map((row) => ({ kind: 'recent' as const, row }));

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (needle ? 88 : 56),
    overscan: 8,
  });

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

  function openConversation(id: string, messageUid?: string) {
    saveActiveConversationId(id);
    if (messageUid && needle) {
      navigate(`/chat/${id}?m=${encodeURIComponent(messageUid)}&q=${encodeURIComponent(needle)}`);
      return;
    }
    navigate(`/chat/${id}`);
  }

  function onSelect(c: ConversationRow) {
    openConversation(c.id);
  }

  function newChat() {
    saveActiveConversationId('');
    navigate('/chat');
  }

  return (
    <div className="relative flex h-dvh bg-surface">
      <Suspense fallback={null}>
        <ConversationSidebar
          open={sidebarOpen}
          activeId=""
          searchActive
          labels={L}
          onToggle={toggleSidebar}
          onSelect={onSelect}
          onNewChat={newChat}
          onSearch={() => navigate('/search')}
          onDeleted={async () => {
            const next = await ensureActiveConversation();
            if (next) openConversation(next.id);
            else newChat();
            setListKey((k) => k + 1);
          }}
          refreshKey={listKey}
        />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-3 pt-6 md:px-8 md:pt-10">
          <label className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-[0_2px_12px_rgba(43,66,43,0.04)]">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="shrink-0 text-muted" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              ref={inputRef}
              className="w-full border-0 bg-transparent text-base text-ink outline-none placeholder:text-muted"
              placeholder={L.searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={L.searchPlaceholder}
            />
            {q ? (
              <button
                type="button"
                className="icon-btn !size-8 shrink-0"
                aria-label={L.close}
                title={L.close}
                onClick={() => setQ('')}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="m6 6 12 12M6 18 18 6" />
                </svg>
              </button>
            ) : null}
          </label>
          <p className="mb-0 mt-5 text-xs font-medium uppercase tracking-wide text-muted">
            {needle ? L.searchResultsHeading : L.searchRecentHeading}
          </p>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-8">
          <div className="relative mx-auto w-full max-w-[720px]" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const item = rows[vi.index]!;
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  {item.kind === 'recent' ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-soft"
                      onClick={() => openConversation(item.row.id)}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.row.title}</span>
                      <span className="shrink-0 text-xs text-muted">{formatChatDate(item.row.updatedAt, locale)}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full flex-col gap-1 rounded-lg px-2 py-3 text-left hover:bg-soft"
                      onClick={() => openConversation(item.hit.conversationId, item.hit.messageUid || undefined)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                          <HighlightedText text={item.hit.title} needle={needle} />
                        </span>
                        <span className="shrink-0 text-xs text-muted">{formatChatDate(item.hit.updatedAt, locale)}</span>
                      </div>
                      {item.hit.matchIn !== 'title' ? (
                        <p className="m-0 line-clamp-2 text-sm leading-5 text-mist">
                          <HighlightedText text={item.hit.snippet} needle={needle} />
                        </p>
                      ) : null}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {rows.length === 0 ? (
            <p className="mx-auto max-w-[720px] px-2 py-8 text-center text-sm text-muted">
              {needle ? L.searchNoResults : L.searchNoChats}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
