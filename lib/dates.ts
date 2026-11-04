/**
 * Date formatting helpers.
 *
 * Pure functions and ICU-independent so server, emails and clients always
 * agree on the string. Keep them trivial and dependency-free.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * "2026-12-05" → "Sat 5 Dec 2026". Falls back to the raw string if the input
 * isn't a parseable date. Treats the date as UTC midnight so time zones don't
 * flip the weekday near midnight.
 */
export function formatEventDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${
    MONTHS[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}

/** "10:00" or "10:00:00" → "10:00 am" for database TIME values. */
export function formatClockTime(value: string | null | undefined): string {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value ?? "");
  if (!match) return "—";
  const hour = Number(match[1]);
  if (hour > 23 || Number(match[2]) > 59) return "—";
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "am" : "pm"}`;
}

/** Format a stored instant as a UK local time, e.g. "10:00 am". */
export function formatLondonTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "am" : "pm"}`;
}
