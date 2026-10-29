"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/button";
import { assignChildTimeSlot, type ActionResult } from "@/app/admin/bookings/actions";
import { controlClass } from "./ui";

type Props = {
  childId: string;
  childName: string;
  /** Current slot as "YYYY-MM-DDTHH:mm" London time, or "" if unassigned. */
  initialValue: string;
  /** Event day "YYYY-MM-DD": the picker opens on, and is limited to, this date. */
  eventDate: string;
  disabled?: boolean;
};

/** Inline time-slot editor for one child. */
export function ChildSlotForm({
  childId,
  childName,
  initialValue,
  eventDate,
  disabled,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = useId();

  function save(next: string | null) {
    setResult(null);
    startTransition(async () => {
      const outcome = await assignChildTimeSlot(childId, next);
      setResult(outcome);
      if (outcome.ok && next === null) setValue("");
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(value === "" ? null : value);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="sr-only">
        Time slot for {childName}
      </label>
      <input
        id={inputId}
        type="datetime-local"
        value={value}
        min={`${eventDate}T00:00`}
        max={`${eventDate}T23:59`}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || pending}
        className={`${controlClass} w-auto min-w-[210px]`}
      />
      <Button type="submit" size="sm" disabled={disabled || pending || value === initialValue}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {value !== "" ? (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={disabled || pending}
          className="min-h-[44px] px-2 text-[15px] font-bold text-trybe-purple underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      ) : null}
      <span
        role="status"
        aria-live="polite"
        className={`text-[14px] font-semibold ${result && !result.ok ? "text-red-900" : "text-periwinkle"}`}
      >
        {result ? (result.ok ? (result.message ?? "Saved.") : result.error) : ""}
      </span>
    </form>
  );
}
