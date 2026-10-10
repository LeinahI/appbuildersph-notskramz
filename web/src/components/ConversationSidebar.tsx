import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  clearFarmerSession,
  loadFarmerSession,
  updateFarmerSessionName,
  type FarmerSession,
} from '../config/farmerSession';
import type { Labels } from '../config/labels';
import type { ConversationRow } from '../lib/db';
import {
  deleteConversation,
  listLocalConversations,
  renameConversation,
  setPinned,
} from '../lib/conversations';
import { farmerMe, updateFarmerName } from '../lib/ws-api';
import { ConfirmDialog } from './ConfirmDialog';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';

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
  const [session, setSession] = useState<FarmerSession | null>(() => loadFarmerSession());
  const [profileOpen, setProfileOpen] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const renameDialog = useRef<HTMLDialogElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listLocalConversations().then(setItems);
  }, [refreshKey, open]);

  useEffect(() => {
    if (!open) return;
    const local = loadFarmerSession();
    setSession(local);
    // Older claims saved a JWT without fullName — refresh from ws when missing.
    if (!local?.token || local.fullName.trim()) return;
    let cancelled = false;
    void farmerMe()
      .then((me) => {
        if (cancelled || !me.fullName?.trim()) return;
        updateFarmerSessionName(me.fullName);
        setSession(loadFarmerSession());
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, refreshKey]);

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

  function openRename() {
    setProfileOpen(false);
    renameDialog.current?.showModal();
    queueMicrotask(() => {
      if (renameInput.current) {
        renameInput.current.value = session?.fullName ?? '';
        renameInput.current.focus();
        renameInput.current.select();
      }
    });
  }

  async function confirmRename(e: FormEvent) {
    e.preventDefault();
    const next = renameInput.current?.value.trim() ?? '';
    if (!next || !session) {
      renameDialog.current?.close();
      return;
    }
    try {
      const res = await updateFarmerName(next);
      updateFarmerSessionName(res.fullName);
      setSession(loadFarmerSession());
    } catch {
      // stay on previous name when API fails
    }
    renameDialog.current?.close();
  }

  function onLogout() {
    clearFarmerSession();
    setSession(null);
    setProfileOpen(false);
  }

  const displayName = session?.fullName?.trim() || null;

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

        <div className="relative shrink-0 border-t border-line px-3 py-3">
          {session ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium hover:bg-soft"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((o) => !o)}
              >
                <span className="min-w-0 flex-1 truncate">{displayName || 'Magsasaka'}</span>
                <span className="shrink-0 text-muted" aria-hidden>
                  ▾
                </span>
              </button>
              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute bottom-full left-2 right-2 z-20 mb-1 rounded-lg border border-line bg-surface py-1 text-sm shadow-md"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left hover:bg-soft"
                    onClick={openRename}
                  >
                    Palitan ang pangalan
                  </button>
                  <LogoutConfirmDialog
                    copy={{
                      label: 'Mag-logout',
                      title: 'Mag-logout?',
                      body: 'Mawawala ang account sa device na ito. Mananatili ang mga chat dito.',
                      confirm: 'Mag-logout',
                      cancel: 'Kanselahin',
                    }}
                    onConfirm={onLogout}
                    triggerClassName="block w-full px-3 py-1.5 text-left text-accent hover:bg-soft"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="px-2 py-1 text-sm text-muted">Walang account</p>
          )}
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

      <dialog
        ref={renameDialog}
        className="w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 text-ink shadow-lg backdrop:bg-black/30"
        onClose={() => undefined}
      >
        <form className="grid gap-3" onSubmit={(e) => void confirmRename(e)}>
          <h2 className="m-0 font-serif text-lg font-medium">Palitan ang pangalan</h2>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Pangalan</span>
            <input
              ref={renameInput}
              type="text"
              name="fullName"
              autoComplete="name"
              className="rounded-lg border border-line bg-canvas px-3 py-2"
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="pill-btn" onClick={() => renameDialog.current?.close()}>
              Kanselahin
            </button>
            <button type="submit" className="pill-btn bg-leaf text-white">
              I-save
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
