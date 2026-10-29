import type { HTMLAttributes, ReactNode } from "react";

export type TagVariant = "featured" | "coming-soon" | "studio-stars" | "tbc";

export type TagProps = {
  /** Visual treatment. Defaults to "featured". */
  variant?: TagVariant;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

// Shared by every pill tag (everything except "tbc").
const pill = [
  "inline-flex items-center whitespace-nowrap",
  "px-[14px] py-1 rounded-pill",
  "font-sans text-[14px] leading-[1.5] font-extrabold uppercase tracking-[0.08em]",
].join(" ");

const variants: Record<TagVariant, string> = {
  featured: cx(pill, "bg-blush text-indigo"),

  "coming-soon": cx(pill, "bg-white border-[1.5px] border-blush text-indigo"),

  // Needs a [data-theme="studio-stars"] ancestor (defines --night / --sunshine).
  "studio-stars": cx(pill, "bg-night text-sunshine"),

  // Placeholder marker for unconfirmed facts, e.g. "[Placeholder — TBC]".
  // Deliberately not a pill, not uppercase, not bold.
  tbc: [
    "inline-flex items-center",
    "px-2 py-0 rounded-[6px]",
    "bg-blush border border-dashed border-lavender text-indigo",
    "font-sans text-[15px] leading-[1.5] font-normal normal-case",
  ].join(" "),
};

export function Tag({
  variant = "featured",
  className,
  children,
  ...rest
}: TagProps) {
  return (
    <span {...rest} className={cx(variants[variant], className)}>
      {children}
    </span>
  );
}
