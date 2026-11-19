/**
 * Confirmed Christmas Fair details. Shared by pages, emails, server actions and
 * the admin. Safe to import from Client Components (no secrets, no I/O).
 *
 * The database is the source of truth for capacity (events.max_family_tickets
 * and max_vendor_pitches) and for the per-person minimum donation, which the
 * create_christmas_fair_ticket_hold RPC applies. Keep the amounts here in step
 * with that migration.
 */
export const FAIR = {
  slug: "christmas-fair-2026",
  name: "Trybe Christmas Fair",
  date: "2026-12-19",
  dateLabel: "Saturday 19 December 2026",
  shortDateLabel: "Sat 19 Dec",
  timeLabel: "12–5pm",
  venue: "Acres",
  address: "12 Acklam Road, London W10 5QZ",
  directions: "Right by the Westway, just off Portobello Road",
  mapQuery: "Acres, 12 Acklam Road, London W10 5QZ",
  setUpLabel: "11:15am",
  packDownLabel: "5:45pm",
  expectedFamilies: 100,
  familyCapacity: 100,
  maxPeoplePerTicket: 8,
  adultMinimumPence: 200,
  childMinimumPence: 100,
  maxExtraDonationPence: 50_000,
  vendorCapacity: 25,
  earlyBirdTables: 10,
  earlyBirdPricePence: 2500,
  standardPricePence: 3500,
  vendorPaymentDays: 3,
  vendorDeadlineLabel: "10 December 2026",
  /** End of 10 December in London (GMT in December). */
  vendorApplicationsCloseAt: "2026-12-11T00:00:00Z",
  maxVendorPhotos: 4,
  maxUploadBytes: 5 * 1024 * 1024,
  uploadBucket: "christmas-fair-vendors",
  acresUrl: "https://www.acres23.co.uk/",
  trybeUrl: "https://www.trybe.uk",
  adminEmail: "trybeappuk@gmail.com",
  termsVersion: "christmas-fair-v2-2026-11",
} as const;

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export const VENDOR_CATEGORIES = [
  { value: "kids", label: "Children’s activity or workshop" },
  { value: "food", label: "Food & treats" },
  { value: "crafts", label: "Crafts & gifts" },
  { value: "other", label: "Something else" },
] as const;

export function vendorCategoryLabel(value: string): string {
  return VENDOR_CATEGORIES.find((c) => c.value === value)?.label ?? "Something else";
}

/** 250 → "£2.50", 200 → "£2". */
export function formatPence(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

export function minimumDonationPence(adults: number, children: number): number {
  return adults * FAIR.adultMinimumPence + children * FAIR.childMinimumPence;
}

/** "Sunday 22 November, 6:05pm" in London time. */
export function formatLondonDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Europe/London" })
    .format(date).replace(/\s/g, "").toLowerCase();
  return `${day}, ${time}`;
}

export function vendorApplicationsOpen(now = Date.now()): boolean {
  return now < Date.parse(FAIR.vendorApplicationsCloseAt);
}

/** True when an ISO timestamp is still in the future. */
export function isFuture(iso: string | null | undefined): boolean {
  return Boolean(iso) && Date.parse(iso as string) > Date.now();
}
