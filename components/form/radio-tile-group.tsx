import type { ReactNode } from "react";

type RadioTileGroupProps = {
  /** Visible group label, styled like a Field label. */
  legend: string;
  /** Group name (set on the fieldset). Each RadioTile still needs the same `name`. */
  name: string;
  /** Number of columns from 480px up; always one column below that. */
  columns?: 1 | 2;
  className?: string;
  /** RadioTile children. */
  children: ReactNode;
};

// Static strings so Tailwind can see every class.
const COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-1 min-[480px]:grid-cols-2",
} as const;

/**
 * Accessible wrapper for a set of RadioTiles: <fieldset> + <legend>, so screen
 * readers announce the group label with each option.
 */
export function RadioTileGroup({
  legend,
  name,
  columns = 2,
  className,
  children,
}: RadioTileGroupProps) {
  return (
    <fieldset
      name={name}
      className={`m-0 min-w-0 border-0 p-0 ${className ?? ""}`.trim()}
    >
      <legend className="mb-[6px] p-0 text-[17px] font-bold">{legend}</legend>
      <div className={`grid gap-[10px] ${COLUMNS[columns]}`}>{children}</div>
    </fieldset>
  );
}
