import { useEffect, useRef, type ReactNode } from 'react';
import { A } from './copy';

export type IconName = 'overview' | 'users' | 'qr' | 'activity' | 'settings' | 'help' | 'hub'
  | 'plus' | 'manual' | 'scan' | 'arrow' | 'lock' | 'close' | 'privacy' | 'registration'
  | 'registered-count' | 'active-count' | 'pending-count' | 'today-count';

export function AdminIcon({ name }: { name: IconName }) {
  return <img className='shrink-0' src={'/admin/' + name + '.svg'} alt='' />;
}

export function AdminDialog({ id, title, children, onClose, wide = false, drawer = false, icon }: {
  id: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
  icon?: IconName;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => { heading.current?.focus(); }, [title]);
  return (
    <dialog ref={dialog} id={id} className={'admin-dialog' + (wide ? ' admin-dialog-wide' : '') + (drawer ? ' admin-drawer' : '')}
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
      {children}
    </dialog>
  );
}
