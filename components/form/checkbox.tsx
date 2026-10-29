import type { ComponentProps, ReactNode } from "react";

export type CheckboxProps = Omit<ComponentProps<"input">, "id" | "type" | "children"> & {
  id: string;
  /** Text shown inline next to the box. May include a link (e.g. to the terms). */
  label: ReactNode;
};

/**
 * Checkbox with an inline label (label wraps the input, so the whole row is a
 * click target). Accent is night in the studio-stars theme and falls back to
 * trybe-purple elsewhere.
 *
 * Note: --accent is NOT used here because the studio-stars theme maps it to
 * sunshine, whereas the design spec wants a night checkbox.
 *
 * Radius is inline for the same reason as TextInput (global focus rule); the
 * night halo keeps the focus ring visible on light surfaces.
 */
export function Checkbox({ id, label, className, style, ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-[17px]">
      <input
        {...rest}
        type="checkbox"
        id={id}
        style={{
          borderRadius: "4px",
          accentColor: "var(--night, var(--trybe-purple))",
          ...style,
        }}
        className={[
          "size-[22px] shrink-0 cursor-[inherit]",
          "focus-visible:shadow-[0_0_0_4px_var(--night)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <span>{label}</span>
    </label>
  );
}
