import { useId, useRef, type ReactNode } from 'react';

export interface LogoutConfirmCopy {
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
}

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
  const titleId = useId();
  const bodyId = useId();

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        aria-label={copy.label}
        title={copy.label}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {trigger ?? copy.label}
      </button>
      <dialog
        ref={dialog}
        className="chat-history max-w-md"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} className="m-0 text-xl font-bold">
          {copy.title}
        </h2>
        <p id={bodyId} className="mt-3 mb-0 text-base leading-7 text-mist">
          {copy.body}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <form method="dialog">
            <button type="submit" className="pill-btn">
              {copy.cancel}
            </button>
          </form>
          <button
            type="button"
            className="btn min-h-11"
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            {copy.confirm}
          </button>
        </div>
      </dialog>
    </>
  );
}
