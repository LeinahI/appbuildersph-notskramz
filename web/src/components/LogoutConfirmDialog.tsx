import { useRef, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmCopy } from './ConfirmDialog';

export type LogoutConfirmCopy = ConfirmCopy & { label: string };

interface LogoutConfirmDialogProps {
  copy: LogoutConfirmCopy;
  onConfirm: () => void;
  /** Trigger button; defaults to a text pill. */
  trigger?: ReactNode;
  triggerClassName?: string;
}

/** Opens a confirm dialog before calling onConfirm (farmer + admin logout). */
export function LogoutConfirmDialog({
  copy,
  onConfirm,
  trigger,
  triggerClassName = 'pill-btn',
}: LogoutConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { label, ...confirmCopy } = copy;

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {trigger ?? label}
      </button>
      <ConfirmDialog ref={dialog} copy={confirmCopy} onConfirm={onConfirm} />
    </>
  );
}
