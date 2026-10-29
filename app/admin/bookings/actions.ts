"use server";

/**
 * Admin booking mutations + CSV export.
 *
 * Every action starts with `requireAdmin()`: the client is never trusted to
 * say who it is. Writes additionally need an owner/editor role (viewers are
 * read-only). Reads use the session client; writes use the service-role client
 * (RLS bypass), which is safe because the admin check happens here first.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminReadClient, adminWriteClient } from "@/components/admin/db";
import {
  BOOKING_STATUS_LABEL,
  formatDateTime,
  isoToLondonLocal,
  londonLocalToIso,
} from "@/components/admin/format";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { stripe } from "@/lib/stripe";
import { parseBookingFilters, type BookingFilters } from "./filters";
import { fetchAllBookingsForExport } from "./queries";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export type ExportResult =
  | { ok: true; filename: string; content: string; rowCount: number; truncated: boolean }
  | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const NO_WRITE_ACCESS = fail("Your account has view-only access.");

const idSchema = z.guid();
const MAX_NOTES_LENGTH = 5000;
const MAX_REASON_LENGTH = 500;

function revalidateBooking(bookingId: string) {
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

/* ── Cancel ──────────────────────────────────────────────────────────────── */

/**
 * Cancels a booking and, if it was paid, refunds it in full through Stripe.
 *
 * Order matters for money safety:
 *  1. Claim the booking with a compare-and-set update (status must still be
 *     what we just read). A double-click or a second admin loses the race and
 *     can never trigger a second refund.
 *  2. Only then call Stripe. If the refund fails the claim is rolled back and
 *     the booking is left exactly as it was.
 *  3. For an unpaid booking, expire its Checkout Session so the parent can't
 *     still complete payment after the places have been released.
 *
 * The Stripe `charge.refunded` webhook will later move a refunded booking from
 * "cancelled" to "refunded"; that is expected.
 */
export async function cancelBooking(
  bookingId: string,
  reason: string,
): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return NO_WRITE_ACCESS;

  const id = idSchema.safeParse(bookingId);
  if (!id.success) return fail("That booking id isn't valid.");
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 3) return fail("Please give a short reason for cancelling.");
  if (why.length > MAX_REASON_LENGTH) {
    return fail(`Keep the reason under ${MAX_REASON_LENGTH} characters.`);
  }

  const db = adminWriteClient();

  const { data: booking, error: readError } = await db
    .from("bookings")
    .select(
      "id, status, internal_notes, stripe_payment_intent_id, stripe_checkout_session_id",
    )
    .eq("id", id.data)
    .maybeSingle();
  if (readError) return fail("Couldn't load the booking. Please try again.");
  if (!booking) return fail("That booking doesn't exist.");

  if (booking.status !== "pending_payment" && booking.status !== "confirmed") {
    return fail(
      `This booking is already ${BOOKING_STATUS_LABEL[booking.status].toLowerCase()}.`,
    );
  }

  const previousStatus = booking.status;
  const previousNotes = booking.internal_notes;
  const refundable =
    previousStatus === "confirmed" && booking.stripe_payment_intent_id !== null;

  const nowIso = new Date().toISOString();
  const stamp = `[${formatDateTime(nowIso)}] Cancelled by ${admin.email}: ${why}`;
  const nextNotes = [previousNotes?.trim(), stamp].filter(Boolean).join("\n");

  // 1. Claim.
  const { data: claimed, error: claimError } = await db
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: nowIso, internal_notes: nextNotes })
    .eq("id", id.data)
    .eq("status", previousStatus)
    .select("id")
    .maybeSingle();
  if (claimError) return fail("Couldn't cancel the booking. Please try again.");
  if (!claimed) {
    return fail("Someone else just changed this booking. Refresh the page and check its status.");
  }

  // 2. Refund (paid bookings only).
  if (refundable && booking.stripe_payment_intent_id) {
    try {
      await stripe().refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: { booking_id: id.data, cancelled_by: admin.email },
      });
    } catch (err) {
      const alreadyRefunded =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "charge_already_refunded";

      if (!alreadyRefunded) {
        // Roll back so the record never says "cancelled" without a refund.
        await db
          .from("bookings")
          .update({
            status: previousStatus,
            cancelled_at: null,
            internal_notes: previousNotes,
          })
          .eq("id", id.data)
          .eq("status", "cancelled");
        revalidateBooking(id.data);

        const detail =
          err instanceof Error && err.message ? ` Stripe said: ${err.message}` : "";
        return fail(
          `Stripe couldn't issue the refund, so the booking was NOT cancelled.${detail}`,
        );
      }
    }
  }

  // 3. Unpaid: stop the parent paying for places we just released. Best effort:
  // the session may already be expired or completed.
  if (previousStatus === "pending_payment" && booking.stripe_checkout_session_id) {
    try {
      await stripe().checkout.sessions.expire(booking.stripe_checkout_session_id);
    } catch {
      // Ignore: nothing useful to do if Stripe says it's already closed.
    }
  }

  revalidateBooking(id.data);
  return {
    ok: true,
    message: refundable ? "Booking cancelled and refunded in full." : "Booking cancelled.",
  };
}

/* ── Time slots ──────────────────────────────────────────────────────────── */

/**
 * Sets (or clears, with null / "") a child's session time.
 *
 * Accepts a `datetime-local` value ("2026-12-05T09:20", read as Europe/London
 * time) or a full ISO timestamp that carries its own zone / offset.
 */
export async function assignChildTimeSlot(
  childId: string,
  scheduledAt: string | null,
): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return NO_WRITE_ACCESS;

  const id = idSchema.safeParse(childId);
  if (!id.success) return fail("That child id isn't valid.");

  let scheduledIso: string | null = null;
  const raw = typeof scheduledAt === "string" ? scheduledAt.trim() : "";
  if (raw !== "") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
      scheduledIso = londonLocalToIso(raw);
    } else if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) {
      const parsed = new Date(raw);
      scheduledIso = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    if (!scheduledIso) return fail("Enter a valid date and time.");
  }

  const db = adminWriteClient();
  const { data, error } = await db
    .from("children")
    .update({ scheduled_at: scheduledIso })
    .eq("id", id.data)
    .select("id, booking_id")
    .maybeSingle();
  if (error) return fail("Couldn't save the time slot. Please try again.");
  if (!data) return fail("That child doesn't exist.");

  revalidateBooking(data.booking_id);
  return {
    ok: true,
    message: scheduledIso
      ? `Slot set to ${formatDateTime(scheduledIso)}.`
      : "Slot cleared.",
  };
}

/* ── Internal notes ──────────────────────────────────────────────────────── */

export async function updateInternalNotes(
  bookingId: string,
  notes: string,
): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return NO_WRITE_ACCESS;

  const id = idSchema.safeParse(bookingId);
  if (!id.success) return fail("That booking id isn't valid.");
  const text = typeof notes === "string" ? notes.trim() : "";
  if (text.length > MAX_NOTES_LENGTH) {
    return fail(`Notes can be up to ${MAX_NOTES_LENGTH} characters.`);
  }

  const db = adminWriteClient();
  const { data, error } = await db
    .from("bookings")
    .update({ internal_notes: text === "" ? null : text })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) return fail("Couldn't save the notes. Please try again.");
  if (!data) return fail("That booking doesn't exist.");

  revalidateBooking(id.data);
  return { ok: true, message: "Notes saved." };
}

/* ── CSV export ──────────────────────────────────────────────────────────── */

const CSV_HEADERS = [
  "created_at",
  "status",
  "event_name",
  "parent_name",
  "parent_email",
  "parent_phone",
  "child_count",
  "time_window",
  "attendance",
  "subtotal_pence",
  "children_names",
] as const;

/**
 * One CSV cell. Quotes when needed, and neutralises spreadsheet formulas:
 * parent names and phone numbers come from a public form, and this file gets
 * opened in Excel. Values that start with = @ tab or CR, or with + / - but are
 * not plain phone-style numbers, get a leading apostrophe.
 */
function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  const startsLikeFormula =
    /^[=@\t\r]/.test(text) ||
    (/^[+-]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text));
  if (startsLikeFormula) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds the CSV for the current filters. Returns the text; the Client
 * Component (ExportCsvButton) turns it into a download.
 */
export async function exportBookingsCsv(
  filters?: BookingFilters,
): Promise<ExportResult> {
  await requireAdmin();

  const parsed = parseBookingFilters(filters);
  const db = await adminReadClient();

  const result = await fetchAllBookingsForExport(db, parsed);
  if (!result.ok) return fail(result.error);
  const { rows, truncated } = result;

  // Event names.
  const { data: events, error: eventsError } = await db
    .from("events")
    .select("id, name");
  if (eventsError) return fail("Couldn't load events for the export.");
  const eventName = new Map((events ?? []).map((e) => [e.id, e.name]));

  // Children names, fetched in small chunks to keep URLs short and stay under
  // the 1000-row response cap (50 bookings x up to 10 children).
  const childrenByBooking = new Map<string, Array<{ position: number; name: string }>>();
  for (let i = 0; i < rows.length; i += 50) {
    const ids = rows.slice(i, i + 50).map((r) => r.id);
    const { data: kids, error: kidsError } = await db
      .from("children")
      .select("booking_id, position, first_name")
      .in("booking_id", ids);
    if (kidsError) return fail("Couldn't load children for the export.");
    for (const kid of kids ?? []) {
      const list = childrenByBooking.get(kid.booking_id) ?? [];
      list.push({ position: kid.position, name: kid.first_name });
      childrenByBooking.set(kid.booking_id, list);
    }
  }

  const lines: string[] = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    const kids = (childrenByBooking.get(row.id) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((k) => k.name)
      .join(", ");
    lines.push(
      [
        row.created_at,
        row.status,
        eventName.get(row.event_id) ?? "",
        row.parent_name,
        row.parent_email,
        row.parent_phone,
        row.child_count,
        row.time_window,
        row.attendance,
        row.subtotal_pence,
        kids,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const today = isoToLondonLocal(new Date().toISOString()).slice(0, 10);
  return {
    ok: true,
    filename: `trybe-bookings-${today}.csv`,
    content: lines.join("\r\n") + "\r\n",
    rowCount: rows.length,
    truncated,
  };
}
