import { useEffect, useRef, type ReactNode } from 'react';
import { A } from './copy';

export type IconName = 'overview' | 'users' | 'qr' | 'activity' | 'settings' | 'help' | 'hub'
  | 'plus' | 'manual' | 'scan' | 'arrow' | 'lock' | 'close' | 'privacy' | 'registration'
  | 'registered-count' | 'active-count' | 'pending-count' | 'today-count';

export function AdminIcon({ name }: { name: IconName }) {
  return <img className='shrink-0' src={'/admin/' + name + '.svg'} alt='' />;
}

export function AdminDialog({ id, title, children, onClose, drawer, icon }: {
  id: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: 'left' | 'right';
  icon?: IconName;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    heading.current?.focus();
    if (content.current) content.current.scrollTop = 0;
  }, [title]);
  return (
    <dialog ref={dialog} id={id} className={'admin-dialog' + (drawer ? ' admin-drawer-' + drawer : '')}
      aria-labelledby={id + '-heading'} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className='admin-dialog-header'>
        <div>
          {icon && <span className='admin-icon-tile mb-4'><AdminIcon name={icon} /></span>}
          <h2 ref={heading} tabIndex={-1} id={id + '-heading'}>{title}</h2>
        </div>
        <button type='button' className='chat-icon-button' onClick={onClose} aria-label={A.close} title={A.close}>
          <AdminIcon name='close' />
        </button>
      </header>
      {drawer === 'right' ? <div ref={content} className='admin-drawer-content'>{children}</div> : children}
    </dialog>
  );
}
