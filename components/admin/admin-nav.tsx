"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "Dashboard", href: "/admin", match: "exact" },
  { label: "Bookings", href: "/admin/bookings", match: "prefix" },
  { label: "Events", href: "/admin/events", match: "prefix" },
] as const;

/**
 * Sidebar links. A Client Component only because it needs usePathname() to
 * mark the current page (layouts can't see the path on the server).
 * Sits on the indigo sidebar, so the focus ring is white.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 md:flex-col md:overflow-visible">
        {LINKS.map((link) => {
          const active =
            link.match === "exact"
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex min-h-[44px] w-full items-center whitespace-nowrap rounded-pill px-4",
                  "text-[16px] font-bold no-underline transition-colors",
                  "focus-visible:outline-white",
                  active
                    ? "bg-white text-indigo hover:text-indigo"
                    : "text-white hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
