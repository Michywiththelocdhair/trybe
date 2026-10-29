/**
 * Pure display + date helpers for the admin dashboard (safe on server and
 * client). All wall-clock times are Europe/London, because that is where the
 * events happen and where Nyah is reading the dashboard.
 */
import type {
  Attendance,
  BookingStatus,
  EventStatus,
  TimeWindow,
} from "@/lib/supabase/types";

export const LONDON_TZ = "Europe/London";

/**
 * Current time in ms. Admin pages are async Server Components that render once
 * per request (after reading cookies, so Cache Components treats them as
 * request-time), so reading the clock is correct. react-hooks/purity flags a
 * bare Date.now() inside a component, so pages call this instead.
 */
export function currentTimeMs(): number {
  return Date.now();
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  expired: "Expired",
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  cancelled: "Cancelled",
};

/** Labels + ranges match the public booking form. */
export const TIME_WINDOW_LABEL: Record<TimeWindow, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  any: "No preference",
};

export const TIME_WINDOW_RANGE: Record<TimeWindow, string> = {
  morning: "9:00 am – 12:00 pm",
  midday: "12:00 pm – 2:30 pm",
  afternoon: "2:30 pm – 5:00 pm",
  any: "Any time, 9:00 am – 5:00 pm",
};

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  stay: "Staying with child",
  drop: "Dropping child off",
};

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** A calendar date with no time (events.event_date, e.g. "2026-12-05"). */
const dateOnlyFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "29 Oct 2026, 14:05" (London). Returns an em dash for null. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

/** "29 Oct 2026" (London). */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dayFmt.format(d);
}

/** "14:05" (London). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : timeFmt.format(d);
}

/** "Sat, 5 Dec 2026" for a `date` column value. */
export function formatEventDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "—" : dateOnlyFmt.format(d);
}

/* ── Europe/London wall-clock <-> instant conversion ─────────────────────── */

const londonPartsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function londonParts(at: Date) {
  const parts = londonPartsFmt.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Minutes London is ahead of UTC at the given instant (0 in winter, 60 in BST). */
function londonOffsetMinutes(at: Date): number {
  const p = londonParts(at);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const instant = Math.floor(at.getTime() / 1000) * 1000;
  return Math.round((wallAsUtc - instant) / 60000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO instant -> "YYYY-MM-DDTHH:mm" London wall time (for datetime-local). */
export function isoToLondonLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = londonParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * "YYYY-MM-DDTHH:mm" London wall time -> ISO instant. Returns null for malformed
 * input, impossible dates (31 Feb) and times that do not exist because the
 * clocks go forward.
 */
export function londonLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(wall)) return null;

  // Two passes so the offset is taken at the real instant, not the naive one.
  let instant = wall - londonOffsetMinutes(new Date(wall)) * 60000;
  instant = wall - londonOffsetMinutes(new Date(instant)) * 60000;

  const iso = new Date(instant).toISOString();
  return isoToLondonLocal(iso) === local ? iso : null;
}

/** Start of a London calendar day ("YYYY-MM-DD") as an ISO instant. */
export function londonDayStartIso(dateStr: string): string | null {
  return londonLocalToIso(`${dateStr}T00:00`);
}

/** Start of the day AFTER the given London calendar day, as an ISO instant. */
export function londonNextDayStartIso(dateStr: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const next = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1));
  const nextStr = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  return londonDayStartIso(nextStr);
}
