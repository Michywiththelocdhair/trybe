import type { BookingStatus } from "@/lib/supabase/types";

/** The columns needed to work out how many places are taken. */
export type HoldRow = {
  event_id: string;
  child_count: number;
  status: BookingStatus;
  expires_at: string;
};

export type EventUsage = {
  /** Children counted against capacity (confirmed + live pending holds). */
  used: number;
  confirmedBookings: number;
  pendingBookings: number;
};

/**
 * Mirrors the capacity rule in `create_booking_with_children`: confirmed
 * bookings count, and so do pending_payment holds that have not yet expired.
 * Expired / cancelled / refunded bookings free their places.
 */
export function usageByEvent(
  rows: readonly HoldRow[],
  nowMs: number,
): Map<string, EventUsage> {
  const usage = new Map<string, EventUsage>();
  for (const row of rows) {
    const isConfirmed = row.status === "confirmed";
    const isLiveHold =
      row.status === "pending_payment" && new Date(row.expires_at).getTime() > nowMs;
    if (!isConfirmed && !isLiveHold) continue;

    const entry = usage.get(row.event_id) ?? {
      used: 0,
      confirmedBookings: 0,
      pendingBookings: 0,
    };
    entry.used += row.child_count;
    if (isConfirmed) entry.confirmedBookings += 1;
    else entry.pendingBookings += 1;
    usage.set(row.event_id, entry);
  }
  return usage;
}

/** Accessible progress bar. `label` names what it measures for screen readers. */
export function CapacityBar({
  used,
  max,
  label,
}: {
  used: number;
  max: number;
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const full = max > 0 && used >= max;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(used, max)}
      aria-valuetext={`${used} of ${max} places taken`}
      className="h-3 w-full overflow-hidden rounded-pill bg-blush"
    >
      <div
        className={`h-full rounded-pill ${full ? "bg-periwinkle" : "bg-trybe-purple"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
