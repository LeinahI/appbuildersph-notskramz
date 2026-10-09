import { useEffect, useRef, useState } from 'react';
import type { Labels } from '../config/labels';
import type { ConversationRow } from '../lib/db';
import {
  deleteConversation,
  listLocalConversations,
  renameConversation,
  setPinned,
} from '../lib/conversations';
import { ConfirmDialog } from './ConfirmDialog';

type Props = {
  open: boolean;
  activeId: string;
  labels: Labels;
  onToggle: () => void;
  onSelect: (c: ConversationRow) => void;
  onNewChat: () => void;
  onSearch: () => void;
  onDeleted: (id: string) => void;
  refreshKey: number;
  /** True when the farmer is on `/search`. */
  searchActive?: boolean;
};

export default function ConversationSidebar({
  open,
  activeId,
  labels,
  onToggle,
  onSelect,
  onNewChat,
  onSearch,
  onDeleted,
  refreshKey,
  searchActive = false,
}: Props) {
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    void listLocalConversations().then(setItems);
  }, [refreshKey, open]);

  function onNew() {
    onNewChat();
    setMenuId(null);
  }

  async function onRename(id: string) {
    const current = items.find((i) => i.id === id);
    const next = window.prompt('Bagong pangalan', current?.title ?? '');
    if (next == null) return;
    await renameConversation(id, next);
    setItems(await listLocalConversations());
    setMenuId(null);
  }

  async function onPin(id: string, pinned: boolean) {
    await setPinned(id, pinned);
    setItems(await listLocalConversations());
    setMenuId(null);
  }

  function requestDelete(id: string) {
    setPendingDeleteId(id);
    setMenuId(null);
    deleteDialog.current?.showModal();
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (!id) return;
    await deleteConversation(id);
    onDeleted(id);
    setItems(await listLocalConversations());
  }

  return (
    <>
      {/* On a phone the list slides over the chat instead of squeezing it; a tap beside it closes it. */}
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={onToggle}
          aria-label="Close sidebar"
          tabIndex={-1}
        />
      ) : null}
      <aside
        className={`flex h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:shadow-lg ${
          open ? 'w-[17.5rem] xl:w-[20rem]' : 'w-0 overflow-hidden border-r-0'
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <span className="font-serif text-lg font-medium tracking-tight">Ugatan</span>
          <button type="button" className="icon-btn" onClick={onToggle} aria-label="Close sidebar" title="Close sidebar">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 px-3 pb-3">
          <button
            type="button"
            onClick={() => void onNew()}
            aria-current={!activeId && !searchActive ? 'page' : undefined}
            className={`flex w-full items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-line/40 ${
              !activeId && !searchActive ? 'bg-soft' : ''
            }`}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            {labels.newChatLabel}
          </button>
          <button
            type="button"
            onClick={onSearch}
            aria-current={searchActive ? 'page' : undefined}
            className={`flex w-full items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-line/40 ${
              searchActive ? 'bg-soft' : ''
            }`}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            {labels.searchChatsLabel}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted">{labels.searchRecentHeading}</p>
          <ul className="m-0 list-none p-0">
            {items.map((c) => (
              <li key={c.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={`flex w-full items-start gap-1 rounded-lg px-2 py-2 text-left text-sm hover:bg-soft ${
                    !searchActive && c.id === activeId ? 'bg-soft' : ''
                  }`}
                >
                  <span className="line-clamp-2 min-w-0 flex-1 break-words leading-5" title={c.title}>{c.title}</span>
                  {c.pinned ? (
                    <span className="shrink-0 text-muted" title="Pinned" aria-hidden>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    </span>
                  ) : null}
                  <span
                    role="button"
                    tabIndex={0}
                    className="icon-btn !size-7 shrink-0"
                    aria-label="Conversation menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId((m) => (m === c.id ? null : c.id));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuId((m) => (m === c.id ? null : c.id));
                      }
                    }}
                  >
                    ···
                  </span>
                </button>
                {menuId === c.id ? (
                  <div className="absolute right-1 z-20 mt-0.5 min-w-[9rem] rounded-lg border border-line bg-surface py-1 text-sm shadow-md">
                    <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-soft" onClick={() => void onRename(c.id)}>
                      Rename
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left hover:bg-soft"
                      onClick={() => void onPin(c.id, !c.pinned)}
                    >
                      {c.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-accent hover:bg-soft"
                      onClick={() => requestDelete(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
            {items.length === 0 ? <li className="px-2 py-4 text-center text-sm text-muted">{labels.searchNoChats}</li> : null}
          </ul>
        </div>
      </aside>

      {!open ? (
        <button
          type="button"
          // On a phone the header's history button opens the chats; this one would sit on top of it.
          className="icon-btn absolute top-3 left-3 z-10 bg-surface/90 shadow-sm max-md:hidden"
          onClick={onToggle}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
      ) : null}

      <ConfirmDialog
        ref={deleteDialog}
        copy={{
          title: labels.deleteConversationConfirmTitle,
          body: labels.deleteConversationConfirmBody,
          confirm: labels.deleteConversationConfirmYes,
          cancel: labels.deleteConversationConfirmNo,
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
