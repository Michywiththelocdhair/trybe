import type { ReactNode } from "react";

/**
 * Tiny layout primitives shared by the admin pages. Dense by design: this is
 * an operations tool, not a brand surface. Server-component safe (no hooks).
 */

/** Native form control styling, matching the site's input look (14px radius, plum border). */
export const controlClass =
  "block w-full min-h-[44px] rounded-input border-[1.5px] border-[color:var(--border-plum)] " +
  "bg-white px-3 text-[16px] text-night disabled:cursor-not-allowed disabled:opacity-60";

/** Quiet text link used inside tables. 44px tall hit area. */
export const tableLinkClass =
  "inline-flex min-h-[44px] items-center font-bold text-trybe-purple underline underline-offset-2 " +
  "hover:text-indigo";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] font-extrabold leading-[1.15] text-indigo">
          {title}
        </h1>
        {description ? (
          <p className="text-[16px] leading-[1.45] text-periwinkle">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** White card with the 1.5px blush border from the brand brief. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-tile border-[1.5px] border-blush bg-white ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  id,
  children,
  hint,
}: {
  id: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-3">
      <h2 id={id} className="text-[20px] font-extrabold leading-[1.2] text-indigo">
        {children}
      </h2>
      {hint ? <p className="text-[14px] text-periwinkle">{hint}</p> : null}
    </div>
  );
}

/** Inline error / info message. Self-contained colours so it passes on any surface. */
export function Notice({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "bg-red-100 text-red-900"
      : "bg-blush text-indigo";
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-input px-4 py-3 text-[15px] font-semibold leading-[1.45] ${styles}`}
    >
      {children}
    </p>
  );
}

/** Table header cell. `sticky` pins it to the top of the scrolling wrapper. */
export function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 whitespace-nowrap bg-blush px-4 py-3 text-left text-[13px] font-extrabold uppercase tracking-[0.08em] text-indigo ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-2 align-middle text-[15px] leading-[1.4] ${className ?? ""}`}>
      {children}
    </td>
  );
}
