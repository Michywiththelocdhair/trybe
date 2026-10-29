"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/button";
import { cancelBooking } from "@/app/admin/bookings/actions";
import { controlClass, Notice } from "./ui";

type Props = {
  bookingId: string;
  parentName: string;
  childCount: number;
  /** Formatted amount that will be refunded, or null if nothing was paid. */
  refundLabel: string | null;
  disabled?: boolean;
};

/**
 * "Cancel booking" button + a native <dialog> confirmation. showModal() gives
 * focus trapping, Escape-to-close and an inert page behind it for free.
 * The reason is required and is written to the booking's internal notes.
 */
export function CancelBookingDialog({
  bookingId,
  parentName,
  childCount,
  refundLabel,
  disabled,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const uid = useId();
  const titleId = `${uid}-title`;
  const reasonId = `${uid}-reason`;

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelBooking(bookingId, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReason("");
      close();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={open} disabled={disabled}>
        Cancel booking
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(e) => {
          // Don't let Escape dismiss the dialog mid-refund.
          if (pending) e.preventDefault();
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border-[1.5px] border-blush bg-white p-0 text-ink backdrop:bg-night/60"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="flex flex-col gap-5 p-6 md:p-8"
        >
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="text-[24px] font-extrabold leading-[1.2] text-indigo">
              Cancel this booking?
            </h2>
            <p className="text-[16px] leading-[1.5]">
              This cancels {parentName}&apos;s booking for {childCount}{" "}
              {childCount === 1 ? "child" : "children"} and releases their places.{" "}
              {refundLabel
                ? `The full payment of ${refundLabel} will be refunded to their card through Stripe.`
                : "No payment has been taken, so there is nothing to refund."}
            </p>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor={reasonId} className="text-[16px] font-bold">
              Reason <span aria-hidden="true">*</span>
              <span className="block text-[14px] font-normal text-periwinkle">
                Saved to this booking&apos;s internal notes. The parent doesn&apos;t see it.
              </span>
            </label>
            <textarea
              id={reasonId}
              required
              minLength={3}
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              className={`${controlClass} py-2`}
            />
          </div>

          {error ? <Notice>{error}</Notice> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" size="sm" onClick={close} disabled={pending}>
              Keep booking
            </Button>
            <Button type="submit" size="sm" disabled={pending || reason.trim().length < 3}>
              {pending
                ? "Cancelling…"
                : refundLabel
                  ? "Cancel and refund"
                  : "Cancel booking"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
