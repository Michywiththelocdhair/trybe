"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/button";

export interface MobileMenuLink {
  label: string;
  href: string;
}

export interface MobileMenuProps {
  links: ReadonlyArray<MobileMenuLink>;
  cta: MobileMenuLink;
}

const FOCUSABLE = "a[href], button:not([disabled])";

/**
 * MobileMenu — the hamburger button plus a full-screen indigo drawer.
 *
 * - The trigger is a 48px circle with a 1.5px blush border (matches HomeMobile).
 * - The drawer is portalled to <body>: the sticky header uses backdrop-filter,
 *   which would otherwise become the containing block for `fixed inset-0`.
 * - Escape closes, Tab is trapped inside the drawer, body scroll is locked
 *   while open, and focus returns to the trigger on close.
 * - Closes itself if the viewport grows past the md breakpoint.
 *
 * Links are passed in as props (rather than imported) because this is a client
 * module: its non-component exports are opaque references on the server.
 */
export function MobileMenu({ links, cta }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const mq = window.matchMedia("(min-width: 768px)");
    const onBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    mq.addEventListener("change", onBreakpointChange);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      mq.removeEventListener("change", onBreakpointChange);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(true)}
        className="flex size-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-blush bg-white text-indigo"
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open
        ? createPortal(
            <div
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-indigo px-6 pb-8 pt-3 text-white md:hidden"
            >
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={close}
                  aria-label="Trybe home"
                  className="display text-[32px] tracking-[-0.01em] text-white no-underline focus-visible:outline-white"
                  style={{ lineHeight: 0.95 }}
                >
                  Trybe
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label="Close menu"
                  onClick={close}
                  className="flex size-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-white/40 text-white focus-visible:outline-white"
                >
                  <svg
                    aria-hidden="true"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <nav aria-label="Mobile" className="mt-8">
                <ul className="m-0 flex list-none flex-col p-0">
                  {links.map((link) => (
                    <li key={link.href} className="border-b border-white/20">
                      <Link
                        href={link.href}
                        onClick={close}
                        className="display flex min-h-[72px] items-center justify-between gap-4 text-[44px] text-white no-underline focus-visible:outline-white"
                        style={{ lineHeight: 0.95 }}
                      >
                        {link.label}
                        <svg
                          aria-hidden="true"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-orchid"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-auto pt-10">
                <Button
                  as="a"
                  href={cta.href}
                  variant="on-dark"
                  onClick={close}
                  className="w-full"
                >
                  {cta.label}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
