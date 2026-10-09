import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertIcon, EyeIcon, EyeOffIcon, LockIcon, Spinner } from './icons';

const inputClass =
  'block w-full rounded-xl border bg-white py-3 pl-11 text-base text-ink placeholder:text-mist/70 transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 disabled:bg-soft disabled:opacity-70';

export const primaryButton =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-sage focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
  label: string;
  icon: ReactNode;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  labelAside?: ReactNode;
};

/** A labelled input with a leading icon, an optional trailing control, and inline validation. */
export function Field({ label, icon, error, hint, trailing, labelAside, ...input }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error || hint;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-label">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sage" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          {...input}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={`${inputClass} ${trailing ? 'pr-12' : 'pr-3.5'} ${error ? 'border-red-600' : 'border-line'}`}
        />
        {trailing ? <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span> : null}
      </div>
      {note ? (
        <p id={noteId} role={error ? 'alert' : undefined} className={`mt-1.5 text-sm ${error ? 'text-red-700' : 'text-mist'}`}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, 'icon' | 'trailing' | 'type'> & {
  showLabel: string;
  hideLabel: string;
};

/** Password input with a show/hide toggle. */
export function PasswordField({ showLabel, hideLabel, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      icon={<LockIcon />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-lg text-sage hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}

export function Checkbox({ label, ...input }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" {...input} className="size-4 rounded border-line accent-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1" />
      {label}
    </label>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({ busy, busyLabel, children, disabled }: { busy: boolean; busyLabel: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" className={primaryButton} disabled={busy || disabled} aria-busy={busy}>
      {busy ? (
        <>
          <Spinner />
          <span>{busyLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
