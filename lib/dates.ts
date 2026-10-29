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
