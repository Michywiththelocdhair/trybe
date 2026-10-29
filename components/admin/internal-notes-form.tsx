"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/button";
import { updateInternalNotes, type ActionResult } from "@/app/admin/bookings/actions";
import { controlClass } from "./ui";

type Props = {
  bookingId: string;
  initialNotes: string;
  disabled?: boolean;
};

/** Free-text admin-only notes for a booking. */
export function InternalNotesForm({ bookingId, initialNotes, disabled }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldId = useId();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const outcome = await updateInternalNotes(bookingId, notes);
      setResult(outcome);
      if (outcome.ok) setSavedNotes(notes.trim());
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor={fieldId} className="text-[16px] font-bold">
        Internal notes
        <span className="block text-[14px] font-normal text-periwinkle">
          Only admins can see these. Cancellations are logged here automatically.
        </span>
      </label>
      <textarea
        id={fieldId}
        rows={6}
        maxLength={5000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={disabled || pending}
        className={`${controlClass} py-2`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={disabled || pending || notes.trim() === savedNotes}
        >
          {pending ? "Saving…" : "Save notes"}
        </Button>
        <span
          role="status"
          aria-live="polite"
          className={`text-[14px] font-semibold ${result && !result.ok ? "text-red-900" : "text-periwinkle"}`}
        >
          {result ? (result.ok ? (result.message ?? "Saved.") : result.error) : ""}
        </span>
      </div>
    </form>
  );
}
