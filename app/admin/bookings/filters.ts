/**
 * Booking-list filters. One parser shared by the list page (reads the URL) and
 * the CSV export action (receives the same shape from the client), so a link
 * and its export always agree. Everything is validated: query-string values and
 * Server Action arguments are untrusted input.
 *
 * Not a "use server" file on purpose: it exports a constant and sync helpers.
 */
import { z } from "zod";
import type { BookingStatus, TimeWindow } from "@/lib/supabase/types";

export const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "cancelled",
  "refunded",
  "expired",
] as const satisfies readonly BookingStatus[];

export const TIME_WINDOWS = [
  "morning",
  "midday",
  "afternoon",
  "any",
] as const satisfies readonly TimeWindow[];

export const PAGE_SIZE = 20;

/** Keys double as the URL query-string names. */
export type BookingFilters = {
  status?: BookingStatus;
  event?: string;
  time_window?: TimeWindow;
  /** YYYY-MM-DD, inclusive, London time. Filters on booking date (created_at). */
  from?: string;
  /** YYYY-MM-DD, inclusive, London time. */
  to?: string;
};

const uuidSchema = z.guid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function isUuid(value: unknown): value is string {
  return uuidSchema.safeParse(value).success;
}

function firstString(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && v !== "" ? v : undefined;
}

/** Accepts URL searchParams or a Server Action argument. Drops anything invalid. */
export function parseBookingFilters(raw: unknown): BookingFilters {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const filters: BookingFilters = {};

  const status = firstString(input.status);
  if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as BookingStatus;
  }

  const event = firstString(input.event);
  if (event && isUuid(event)) filters.event = event;

  const windowValue = firstString(input.time_window);
  if (windowValue && (TIME_WINDOWS as readonly string[]).includes(windowValue)) {
    filters.time_window = windowValue as TimeWindow;
  }

  const from = firstString(input.from);
  if (from && dateSchema.safeParse(from).success) filters.from = from;

  const to = firstString(input.to);
  if (to && dateSchema.safeParse(to).success) filters.to = to;

  return filters;
}

/** Positive page number from ?page=, defaulting to 1. */
export function parsePage(raw: unknown): number {
  const value = firstString(raw);
  const n = value ? Number.parseInt(value, 10) : 1;
  return Number.isFinite(n) && n >= 1 && n <= 10_000 ? n : 1;
}

/** Build /admin/bookings?... keeping the active filters. */
export function bookingsHref(filters: BookingFilters, page = 1): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as Array<[string, string | undefined]>).forEach(
    ([key, value]) => {
      if (value) params.set(key, value);
    },
  );
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/bookings?${qs}` : "/admin/bookings";
}

export function hasActiveFilters(filters: BookingFilters): boolean {
  return Object.values(filters).some(Boolean);
}
