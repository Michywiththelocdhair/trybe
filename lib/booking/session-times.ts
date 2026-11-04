export const SESSION_START_TIMES = [
  "10:00",
  "10:20",
  "10:40",
  "11:00",
  "11:20",
  "11:40",
  "12:00",
  "12:20",
  "12:40",
  "13:00",
  "13:20",
  "13:40",
] as const;

export type SessionStartTime = (typeof SESSION_START_TIMES)[number];

export const SESSION_LENGTH_MINUTES = 20;
export const EVENT_START_MINUTES = 10 * 60;
export const EVENT_END_MINUTES = 14 * 60;

export function formatSessionStart(time: SessionStartTime): string {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const suffix = hour < 12 ? "am" : "pm";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}
