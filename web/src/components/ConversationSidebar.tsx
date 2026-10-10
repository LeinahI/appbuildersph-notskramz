import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearFarmerSession, loadFarmerSession, updateFarmerSessionName, type FarmerSession } from '../config/farmerSession';
import type { Labels } from '../config/labels';
import type { ConversationRow } from '../lib/db';
import { deleteConversation, listLocalConversations, renameConversation, setPinned } from '../lib/conversations';
import { farmerMe, updateFarmerName } from '../lib/ws-api';
import './conversation-sidebar.css';

/** Chat rename/delete, or the claimed farmer's own name and logout. */
type Action = { kind: 'rename'; chat: ConversationRow } | { kind: 'delete'; chat: ConversationRow } | { kind: 'name' } | { kind: 'logout' };

type Props = {
  open: boolean;
  desktop: boolean;
  activeId: string;
  labels: Labels;
  onToggle: () => void;
  onSelect: (c: ConversationRow) => void;
  onNewChat: () => void;
  onSearch: () => void;
  onDeleted: (id: string) => void | Promise<void>;
  refreshKey: number;
  searchActive?: boolean;
};

export default function ConversationSidebar({ open, desktop, activeId, labels, onToggle, onSelect, onNewChat, onSearch, onDeleted, refreshKey, searchActive = false }: Props) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [session, setSession] = useState<FarmerSession | null>(() => loadFarmerSession());
  const [profileOpen, setProfileOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [panelError, setPanelError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const drawer = useRef<HTMLDialogElement>(null);
  const actionDialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const headerButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLLIElement>(null);
  const profile = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const savingRef = useRef(false);

  async function reload() {
    setLoading(true);
    try { setItems(await listLocalConversations()); setPanelError(''); }
    catch { setPanelError(labels.chatLoadError); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listLocalConversations().then(rows => { if (!cancelled) { setItems(rows); setPanelError(''); } })
      .catch(() => { if (!cancelled) setPanelError(labels.chatLoadError); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, open, labels.chatLoadError]);

  useEffect(() => {
    if (!open) return;
    const local = loadFarmerSession();
    setSession(local);
    // Older claims saved a JWT without fullName: fill it from ws.
    if (!local?.token || local.fullName.trim()) return;
    let cancelled = false;
    void farmerMe().then(me => {
      if (cancelled || !me.fullName?.trim()) return;
      updateFarmerSessionName(me.fullName);
      setSession(loadFarmerSession());
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [open, refreshKey]);

  useEffect(() => {
    if (!profileOpen) return;
    function outside(event: PointerEvent) {
      if (!profile.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [profileOpen]);

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (open && !desktop && !dialog.open) dialog.showModal();
    else if ((!open || desktop) && dialog.open) dialog.close();
  }, [open, desktop]);

  useEffect(() => {
    if (!action) return;
    if (!actionDialog.current?.open) actionDialog.current?.showModal();
    if (action.kind === 'rename' || action.kind === 'name') { input.current?.focus(); input.current?.select(); }
  }, [action]);

  useEffect(() => {
    if (!menuId) return;
    function outside(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) setMenuId(null);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuId]);

  function closeAction() {
    if (savingRef.current) return;
    actionDialog.current?.close();
    setAction(null);
    setError('');
    trigger.current?.focus();
  }

  function requestAction(kind: 'rename' | 'delete', chat: ConversationRow) {
    setTitle(chat.title);
    setError('');
    setAction({ kind, chat });
    setMenuId(null);
  }

  function requestProfile(kind: 'name' | 'logout') {
    trigger.current = profileButton.current;
    setTitle(session?.fullName ?? '');
    setError('');
    setProfileOpen(false);
    setAction({ kind });
  }

  async function submitProfile(kind: 'name' | 'logout') {
    if (kind === 'logout') {
      clearFarmerSession();
      setSession(null);
      trigger.current = headerButton.current;
      closeAction();
      return;
    }
    const next = title.trim();
    if (!next) { setError(labels.chatTitleRequired); input.current?.focus(); return; }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const me = await updateFarmerName(next);
      updateFarmerSessionName(me.fullName);
      setSession(loadFarmerSession());
    } catch {
      setError(labels.chatActionError);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    closeAction();
  }

  async function refreshSearch() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['chat-search'] }),
      queryClient.invalidateQueries({ queryKey: ['chat-search-recent'] }),
    ]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!action || savingRef.current) return;
    if (action.kind === 'name' || action.kind === 'logout') return submitProfile(action.kind);
    const { chat } = action;
    const next = title.trim();
    if (action.kind === 'rename' && !next) { setError(labels.chatTitleRequired); input.current?.focus(); return; }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (action.kind === 'rename') await renameConversation(chat.id, next);
      else await deleteConversation(chat.id);
    } catch {
      setError(labels.chatActionError);
      savingRef.current = false;
      setSaving(false);
      return;
    }
    // The write succeeded: a later refresh failure must not invite a second deletion.
    savingRef.current = false;
    setSaving(false);
    closeAction();
    if (action.kind === 'rename') setItems(rows => rows.map(row => row.id === chat.id ? { ...row, title: next } : row));
    else {
      setItems(rows => rows.filter(row => row.id !== chat.id));
      headerButton.current?.focus();
    }
    try {
      if (action.kind === 'delete') await onDeleted(chat.id);
      await refreshSearch();
      await reload();
    } catch { setPanelError(labels.chatLoadError); }
  }

  async function pin(chat: ConversationRow) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setPanelError('');
    try {
      await setPinned(chat.id, !chat.pinned);
    } catch {
      setPanelError(labels.chatActionError);
      savingRef.current = false;
      setSaving(false);
      return;
    }
    try {
      setItems(rows => rows.map(row => row.id === chat.id ? { ...row, pinned: !chat.pinned } : row));
      setMenuId(null);
      await refreshSearch();
      await reload();
    } catch { setPanelError(labels.chatLoadError); }
    finally { savingRef.current = false; setSaving(false); }
  }

  const content = <>
    <div className='conversation-sidebar-header'>
      <span className='font-display font-semibold'>{labels.appName}</span>
      <button ref={headerButton} type='button' className='sidebar-icon' onClick={onToggle} aria-label={labels.sidebarCloseLabel} title={labels.sidebarCloseLabel}>
        <svg width={20} height={20} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} aria-hidden><rect x='3' y='4' width='18' height='16' rx='2' /><path d='M9 4v16' /></svg>
      </button>
    </div>
    <nav className='conversation-sidebar-nav' aria-label={labels.sidebarTitle}>
      <button type='button' onClick={() => { setMenuId(null); onNewChat(); }} aria-current={!activeId && !searchActive ? 'page' : undefined}>+ {labels.newChatLabel}</button>
      <button type='button' onClick={onSearch} aria-current={searchActive ? 'page' : undefined}>{labels.searchChatsLabel}</button>
    </nav>
    <div className='conversation-sidebar-list'>
      {panelError ? <div><p role='alert'>{panelError}</p><button type='button' onClick={reload}>{labels.chatRetryLabel}</button></div> : null}
      <p className='text-xs font-medium text-muted'>{labels.searchRecentHeading}</p>
      {loading ? <p role='status' className='text-sm text-muted'>{labels.chatLoading}</p> : null}
      <ul className='m-0 list-none p-0'>
        {items.map(chat => <li key={chat.id} className='conversation-sidebar-row' ref={menuId === chat.id ? menu : undefined}>
          <button type='button' className='conversation-sidebar-select' title={chat.title} onClick={() => { setMenuId(null); onSelect(chat); }} aria-current={!searchActive && chat.id === activeId ? 'page' : undefined}>
            <span id={`chat-title-${chat.id}`} className='min-w-0 flex-1 truncate'>{chat.title}</span>
            {chat.pinned ? <span role='img' aria-label={labels.chatPinnedHeading}>⌖</span> : null}
          </button>
          <button type='button' className='sidebar-icon' aria-label={labels.chatActionsLabel} title={labels.chatActionsLabel} aria-describedby={`chat-title-${chat.id}`} aria-expanded={menuId === chat.id} aria-controls={`chat-actions-${chat.id}`} disabled={saving}
            onClick={event => { trigger.current = event.currentTarget; setMenuId(menuId === chat.id ? null : chat.id); }}>···</button>
          {menuId === chat.id ? <div id={`chat-actions-${chat.id}`} className='conversation-sidebar-actions' onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setMenuId(null); trigger.current?.focus(); } }}>
            <button type='button' onClick={() => requestAction('rename', chat)}>{labels.chatRenameLabel}</button>
            <button type='button' onClick={() => pin(chat)} disabled={saving}>{chat.pinned ? labels.chatUnpinLabel : labels.chatPinLabel}</button>
            <button type='button' onClick={() => requestAction('delete', chat)}>{labels.chatDeleteLabel}</button>
          </div> : null}
        </li>)}
        {!loading && !items.length ? <li className='py-4 text-sm text-muted'>{labels.searchNoChats}</li> : null}
      </ul>
    </div>
    <div ref={profile} className='conversation-sidebar-profile'>
      {session ? <>
        {profileOpen ? <div id='farmer-profile-actions' className='conversation-sidebar-actions' onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setProfileOpen(false); profileButton.current?.focus(); } }}>
          <button type='button' onClick={() => requestProfile('name')}>{labels.profileRenameLabel}</button>
          <button type='button' className='text-accent' onClick={() => requestProfile('logout')}>{labels.profileLogoutLabel}</button>
        </div> : null}
        <button ref={profileButton} type='button' className='conversation-sidebar-select' aria-expanded={profileOpen} aria-controls='farmer-profile-actions'
          title={labels.profileMenuLabel} onClick={() => setProfileOpen(value => !value)}>
          <span className='min-w-0 flex-1 truncate'>{session.fullName.trim() || labels.profileDefaultName}</span>
          <span aria-hidden>{profileOpen ? '▴' : '▾'}</span>
        </button>
      </> : <p className='text-sm text-muted'>{labels.profileNoAccount}</p>}
    </div>
  </>;

  const actionTitle = action?.kind === 'rename' ? labels.chatRenameLabel
    : action?.kind === 'name' ? labels.profileRenameLabel
    : action?.kind === 'logout' ? `${labels.profileLogoutLabel}?`
    : labels.deleteConversationConfirmTitle;
  const submitLabel = action?.kind === 'rename' || action?.kind === 'name' ? labels.chatSaveLabel
    : action?.kind === 'logout' ? labels.profileLogoutLabel
    : labels.deleteConversationConfirmYes;

  return <>
    {desktop ? (open ? <aside id='ugatan-conversation-sidebar' className='conversation-sidebar' aria-label={labels.sidebarTitle}>{content}</aside> : null)
      : <dialog id='ugatan-conversation-sidebar' ref={drawer} className='conversation-sidebar conversation-sidebar-drawer' aria-label={labels.sidebarTitle}
        onCancel={event => { event.preventDefault(); onToggle(); }}
        onClose={() => { if (open && !desktop) onToggle(); }}
        onClick={event => { const box = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) onToggle(); }}>{content}</dialog>}
    <dialog ref={actionDialog} className='chat-history chat-action-dialog' aria-labelledby='chat-action-title' aria-describedby={action?.kind === 'delete' || action?.kind === 'logout' ? 'chat-action-body' : undefined}
      onCancel={event => { event.preventDefault(); closeAction(); }}>
      <form onSubmit={submit} aria-busy={saving}>
        <h2 id='chat-action-title' className='m-0 text-xl font-semibold'>{actionTitle}</h2>
        {action?.kind === 'rename' || action?.kind === 'name' ? <label className='block mt-4'>{action.kind === 'name' ? labels.profileNameLabel : labels.chatTitleLabel}<input ref={input} className='mt-2 w-full rounded-xl border border-line bg-surface p-3 text-base' value={title} maxLength={120} disabled={saving}
          aria-invalid={!!error} aria-describedby={error ? 'chat-action-error' : undefined} onChange={event => { setTitle(event.target.value); setError(''); }} /></label>
          : <p id='chat-action-body' className='text-mist'>{action?.kind === 'logout' ? labels.profileLogoutBody : labels.deleteConversationConfirmBody}</p>}
        {error ? <p id='chat-action-error' role='alert'>{error}</p> : null}
        <div className='mt-6 flex flex-wrap justify-end gap-2'>
          <button type='button' className='pill-btn' disabled={saving} onClick={closeAction}>{labels.deleteConversationConfirmNo}</button>
          <button type='submit' className='btn' disabled={saving}>{submitLabel}</button>
        </div>
      </form>
    </dialog>
  </>;
}
