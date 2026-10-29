"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/button";

type Props = {
  children: string;
  /** Toast text shown on click. */
  message: string;
  /** Accessible name when the visible label is ambiguous, e.g. "Edit Studio Stars". */
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
};

/**
 * A button for features that arrive in a later phase. Clicking it shows a
 * short toast instead of doing anything. The toast is a polite live region so
 * screen-reader users hear it too.
 */
export function ComingSoonButton({
  children,
  message,
  label,
  variant = "outline",
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        aria-label={label}
        onClick={() => setVisible(true)}
      >
        {children}
      </Button>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-6 z-[60] flex justify-center"
      >
        {visible ? (
          <p className="rounded-pill bg-indigo px-6 py-3 text-[16px] font-bold text-white shadow-lg">
            {message}
          </p>
        ) : null}
      </div>
    </>
  );
}
