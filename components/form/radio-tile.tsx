import type { ComponentProps } from "react";

export type RadioTileProps = Omit<
  ComponentProps<"input">,
  "type" | "name" | "value" | "id" | "children"
> & {
  /** Radios sharing a name form one group. */
  name: string;
  value: string;
  /** Bold title line. */
  label: string;
  /** Second line, e.g. a time range. */
  hint?: string;
  /** Defaults to `${name}-${value}` (slugged). */
  id?: string;
};

const slug = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, "-");

/**
 * Selectable tile built on a native radio. The <label> wraps the input, and the
 * selected look is driven by `:has(:checked)` so it works controlled or not.
 *
 * The tile owns its surface (white / cream) and text colour (night), so the
 * muted-plum hint keeps >= 4.5:1 on whichever backdrop the tile sits on. The
 * focus ring colour is switched to night for the radio, since it always sits
 * on a light tile (the global ring is white in the studio-stars theme).
 */
export function RadioTile({
  name,
  value,
  label,
  hint,
  id,
  className,
  style,
  ...rest
}: RadioTileProps) {
  const inputId = id ?? `${slug(name)}-${slug(value)}`;
  return (
    <label
      htmlFor={inputId}
      className={[
        "flex cursor-pointer items-start gap-[10px] px-4 py-[14px]",
        "rounded-[16px] border-2 border-[color:var(--border-lilac)] bg-white text-night",
        "transition-colors duration-150",
        "has-checked:border-night has-checked:bg-cream",
        "has-disabled:cursor-not-allowed has-disabled:opacity-60",
        "[--focus:var(--night)]",
      ].join(" ")}
    >
      <input
        {...rest}
        type="radio"
        id={inputId}
        name={name}
        value={value}
        style={{ borderRadius: "50%", ...style }}
        className={[
          "mt-[2px] size-[20px] shrink-0 cursor-[inherit] accent-night",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <span className="flex min-w-0 flex-col">
        <strong className="text-[17px] font-bold leading-[1.3]">{label}</strong>
        {hint ? (
          <span className="text-[14px] text-[color:var(--muted-plum)]">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}
