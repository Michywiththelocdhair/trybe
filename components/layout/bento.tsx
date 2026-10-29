import type { HTMLAttributes } from "react";

export type BentoColumns = 1 | 2 | 3 | 4 | 5 | 6;
export type BentoGap = "sm" | "md" | "lg";

// Lookup tables keep every class a literal string. Tailwind v4 scans source
// text, so `md:grid-cols-${n}` built at runtime would never be generated.
const COLS: Record<BentoColumns, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const GAP: Record<BentoGap, string> = {
  sm: "gap-2", // 8px
  md: "gap-4", // 16px (the brief's bento gap)
  lg: "gap-8", // 32px
};

const SPAN: Record<BentoColumns, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
};

export interface BentoProps extends HTMLAttributes<HTMLDivElement> {
  /** Equal columns from the md breakpoint up. Always 1 column on mobile. */
  columns?: BentoColumns;
  gap?: BentoGap;
}

/** Grid helper: single column on mobile, `columns` equal columns from md. */
export function Bento({
  columns = 3,
  gap = "md",
  className,
  children,
  ...rest
}: BentoProps) {
  return (
    <div
      {...rest}
      className={`grid grid-cols-1 ${COLS[columns]} ${GAP[gap]} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export interface BentoItemProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Columns to span from md up (ignored on mobile, where everything stacks).
   * Keep it <= the parent Bento's `columns`, otherwise the grid adds implicit columns.
   */
  span?: BentoColumns;
}

/** Grid cell that can span multiple columns of a Bento. */
export function BentoItem({
  span = 1,
  className,
  children,
  ...rest
}: BentoItemProps) {
  return (
    <div {...rest} className={`${SPAN[span]} ${className ?? ""}`}>
      {children}
    </div>
  );
}
