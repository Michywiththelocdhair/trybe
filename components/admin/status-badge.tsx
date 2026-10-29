import type { BookingStatus, EventStatus } from "@/lib/supabase/types";
import { BOOKING_STATUS_LABEL, EVENT_STATUS_LABEL } from "./format";

/**
 * Small status chips for the admin tables. Every chip carries its text label,
 * so colour is never the only signal. Contrast checked at >= 4.5:1:
 *   white on green-700 5.0 · indigo on blush 9.0 · white on periwinkle 6.5
 *   night on orchid 5.8 · gray-700 on white 10
 *
 * Deviation from the brief: "refunded" was specced as white on lavender, which
 * is 3.96:1 and fails AA at this size, so it uses night on orchid instead.
 */
const base =
  "inline-flex items-center whitespace-nowrap rounded-pill px-[10px] py-[2px] " +
  "text-[13px] font-extrabold uppercase leading-[1.5] tracking-[0.06em]";

const BOOKING_STYLES: Record<BookingStatus, string> = {
  confirmed: "bg-green-700 text-white",
  pending_payment: "bg-blush text-indigo ring-1 ring-inset ring-lavender/50",
  cancelled: "bg-periwinkle text-white",
  refunded: "bg-orchid text-night",
  expired: "border border-gray-400 bg-transparent text-gray-700",
};

const EVENT_STYLES: Record<EventStatus, string> = {
  published: "bg-green-700 text-white",
  draft: "border border-dashed border-lavender bg-blush text-indigo",
  closed: "bg-periwinkle text-white",
  cancelled: "bg-orchid text-night",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`${base} ${BOOKING_STYLES[status]}`}>
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`${base} ${EVENT_STYLES[status]}`}>
      {EVENT_STATUS_LABEL[status]}
    </span>
  );
}
