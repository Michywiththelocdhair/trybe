"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/button";
import { exportBookingsCsv } from "@/app/admin/bookings/actions";
import type { BookingFilters } from "@/app/admin/bookings/filters";

/**
 * Calls the exportBookingsCsv Server Action with the filters currently in the
 * URL, then hands the returned text to the browser as a file download.
 * The BOM makes Excel read the file as UTF-8 (names with accents).
 */
export function ExportCsvButton({ filters }: { filters: BookingFilters }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(
    null,
  );

  function onExport() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await exportBookingsCsv(filters);
        if (!result.ok) {
          setMessage({ tone: "error", text: result.error });
          return;
        }

        const blob = new Blob(["﻿", result.content], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setMessage({
          tone: "info",
          text: result.truncated
            ? `Exported the first ${result.rowCount.toLocaleString("en-GB")} bookings (limit reached). Narrow the filters to export the rest.`
            : `Exported ${result.rowCount.toLocaleString("en-GB")} ${result.rowCount === 1 ? "booking" : "bookings"}.`,
        });
      } catch {
        setMessage({ tone: "error", text: "The export failed. Please try again." });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" size="sm" onClick={onExport} disabled={pending}>
        {pending ? "Preparing CSV…" : "Export CSV"}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={`max-w-[320px] text-right text-[14px] leading-[1.4] ${
          message?.tone === "error" ? "font-semibold text-red-900" : "text-periwinkle"
        }`}
      >
        {message?.text ?? ""}
      </p>
    </div>
  );
}
