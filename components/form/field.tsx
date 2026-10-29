import type { ReactNode } from "react";

type FieldProps = {
  /** Visible label text. */
  label: string;
  /** id of the input this label belongs to. The input must carry this same id. */
  htmlFor: string;
  /** Muted helper text shown under the label. */
  hint?: string;
  /** Validation message shown under the input. */
  error?: string;
  /** Adds a visual required marker. Also set `required` on the input itself. */
  required?: boolean;
  className?: string;
  /** The input (TextInput, etc.). It must have id={htmlFor}. */
  children: ReactNode;
};

/**
 * Pairs a <label> with its input. Deliberately not magic: no cloneElement, the
 * consumer passes the same id to Field (htmlFor) and to the input (id).
 *
 * Hint and error render with predictable ids so the input can reference them:
 *   hint  -> `${htmlFor}-hint`
 *   error -> `${htmlFor}-error`
 * e.g. <TextInput id="x" aria-invalid={!!err} aria-describedby="x-hint x-error" />
 * (ids that are not in the DOM are ignored by assistive tech).
 *
 * Colours are surface-agnostic: the label inherits, the hint is the inherited
 * colour at 75% opacity (>= 4.5:1 on both night and white), and the error is a
 * self-contained chip so it passes on any background.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-[6px] ${className ?? ""}`.trim()}>
      <label htmlFor={htmlFor} className="text-[17px] font-bold">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="m-0 text-[15px] leading-[1.45] opacity-75">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="m-0 self-start rounded-input bg-red-100 px-3 py-1 text-[15px] font-semibold leading-[1.45] text-red-900"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
