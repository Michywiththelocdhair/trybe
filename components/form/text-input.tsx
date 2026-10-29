import type { ComponentProps } from "react";

export type TextInputProps = Omit<ComponentProps<"input">, "id" | "type"> & {
  /** Required so a <Field htmlFor> label can point at it. */
  id: string;
  type?: "text" | "email" | "tel" | "url";
};

/**
 * Single-line text input for the booking flow (Studio Stars tokens).
 * Use `type="email"` / `type="tel"`, or `type="text" inputMode="numeric"` for ages.
 * Set `aria-invalid` when showing a Field error; the border turns red.
 *
 * Radius is inline on purpose: the global :focus-visible rule in globals.css is
 * unlayered and sets border-radius: 4px, which would beat a utility class and
 * make the input snap square on focus. The night box-shadow halo keeps the
 * (white) global focus ring visible when the input sits on a light surface.
 */
export function TextInput({
  type = "text",
  className,
  style,
  ...rest
}: TextInputProps) {
  return (
    <input
      type={type}
      {...rest}
      style={{ borderRadius: "var(--r-input)", ...style }}
      className={[
        "block w-full min-h-[52px] px-4",
        "border-[1.5px] border-[color:var(--border-plum)] bg-white text-night",
        "text-[18px] placeholder:text-[color:var(--muted-plum)]",
        "focus-visible:shadow-[0_0_0_4px_var(--night)]",
        "aria-invalid:border-red-700",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
