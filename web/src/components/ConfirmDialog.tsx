import { forwardRef, useId } from 'react';

export interface ConfirmCopy {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
}

interface ConfirmDialogProps {
  copy: ConfirmCopy;
  onConfirm: () => void;
}

/** Native `<dialog>` confirm using the same chrome as help / logout. */
export const ConfirmDialog = forwardRef<HTMLDialogElement, ConfirmDialogProps>(function ConfirmDialog(
  { copy, onConfirm },
  ref,
) {
  const titleId = useId();
  const bodyId = useId();

  return (
    <dialog ref={ref} className="chat-history max-w-md" aria-labelledby={titleId} aria-describedby={bodyId}>
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
          onClick={(e) => {
            e.currentTarget.closest('dialog')?.close();
            onConfirm();
          }}
        >
          {copy.confirm}
        </button>
      </div>
    </dialog>
  );
});
