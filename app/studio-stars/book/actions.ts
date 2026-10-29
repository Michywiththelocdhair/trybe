"use server";

import type Stripe from "stripe";
import { z } from "zod";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase/service";
import { calculateTotal } from "./pricing";
import { BookingSchema, type BookingInput, type BookingResult } from "./schema";

/**
 * Booking Server Action (Phase 3).
 *
 *   validate (zod)
 *     -> load the published event by slug
 *     -> create_booking_with_children RPC (capacity-checked, creates a
 *        pending_payment hold + child rows in one transaction)
 *     -> Stripe Checkout Session (line items priced from the EVENT row)
 *     -> save the session id on the booking
 *     -> hand the hosted-checkout URL back to the client
 *
 * The booking is confirmed later by the Stripe webhook
 * (app/api/webhooks/stripe/route.ts), never from here.
 *
 * Note: a "use server" module may only export async functions, so helpers
 * below are intentionally not exported.
 */

const STUDIO_STARS_SLUG = "studio-stars-2026-12";

/**
 * Stripe rejects Checkout Sessions that expire sooner than 30 minutes after
 * creation (and later than 24 hours). The DB hold is shorter (15 min), so the
 * Stripe session is clamped into Stripe's window; the expire-bookings cron
 * also expires the Stripe session when it releases a stale hold.
 * The extra minute absorbs clock/latency between us computing the timestamp
 * and Stripe receiving it.
 */
const STRIPE_MIN_SESSION_MINUTES = 31;
const STRIPE_MAX_SESSION_MINUTES = 24 * 60 - 1;

const GENERIC_ERROR = "Something went wrong creating your booking. Please try again.";

const RPC_ERROR_MESSAGES: Record<string, string> = {
  P0001: "Please add between 1 and 10 children.",
  P0002: "We can't find this event any more. Please refresh and try again.",
  P0003: "Bookings for this event aren't open right now.",
  P0004: "This event is now fully booked. Join the waitlist to be notified of a spot.",
};

/** The RPC's `raise exception` messages, as a fallback if `code` is ever absent. */
const RPC_ERROR_CODE_BY_MESSAGE: Record<string, string> = {
  invalid_child_count: "P0001",
  event_not_found: "P0002",
  event_not_bookable: "P0003",
  capacity_exceeded: "P0004",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * "2026-12-05" -> "Sat 5 Dec 2026". Pure and ICU-independent so server and
 * emails always agree. Falls back to the raw string if it isn't a date.
 * (The confirmation page keeps its own copy: this file can't export it.)
 */
function formatEventDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** First message per field path, e.g. "children.0.age" or "parentEmail". */
function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {
    form: "Please check your details and try again.",
  };
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

function formError(message: string): BookingResult {
  return { ok: false, errors: { form: message } };
}

/**
 * Free the capacity held by a booking whose checkout could not be started.
 * Best effort: if this fails the expire-bookings cron will catch it.
 */
async function releaseHold(bookingId: string, reason: string): Promise<void> {
  const { error } = await supabaseService()
    .from("bookings")
    .update({ status: "expired" })
    .eq("id", bookingId)
    .eq("status", "pending_payment");
  if (error) {
    console.error("[booking] failed to release hold", {
      bookingId,
      reason,
      code: error.code,
      message: error.message,
    });
  }
}

export async function createBookingSession(
  input: unknown,
): Promise<BookingResult> {
  const parsed = BookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error) };
  }

  try {
    return await startCheckout(parsed.data);
  } catch (err) {
    // Missing env vars, network failures, anything unforeseen. Never leak
    // internals to the parent; the message here carries no secrets.
    console.error("[booking] unexpected failure", {
      message: err instanceof Error ? err.message : String(err),
    });
    return formError(GENERIC_ERROR);
  }
}

async function startCheckout(data: BookingInput): Promise<BookingResult> {
  const db = supabaseService();

  // 1. The event. Prices come from this row, never from the client.
  const { data: event, error: eventError } = await db
    .from("events")
    .select(
      "id, name, subtitle, venue, event_date, first_ticket_price_pence, sibling_ticket_price_pence, status",
    )
    .eq("slug", STUDIO_STARS_SLUG)
    .maybeSingle();

  if (eventError) {
    console.error("[booking] event lookup failed", {
      slug: STUDIO_STARS_SLUG,
      code: eventError.code,
      message: eventError.message,
    });
    return formError(GENERIC_ERROR);
  }
  if (!event || event.status !== "published") {
    return formError("This event isn't available for booking right now.");
  }

  // 2. Capacity-checked hold: booking + children rows in one transaction.
  const { data: booking, error: rpcError } = await db.rpc(
    "create_booking_with_children",
    {
      p_event_id: event.id,
      p_parent_name: data.parentName,
      p_parent_email: data.parentEmail,
      p_parent_phone: data.parentPhone,
      p_time_window: data.timeSlot,
      p_attendance: data.attendance,
      p_terms_version: env.TERMS_VERSION,
      p_children: data.children.map((c) => ({
        first_name: c.firstName,
        age: c.age,
      })),
    },
  );

  if (rpcError) {
    const code =
      rpcError.code && rpcError.code in RPC_ERROR_MESSAGES
        ? rpcError.code
        : RPC_ERROR_CODE_BY_MESSAGE[rpcError.message ?? ""];
    const friendly = code ? RPC_ERROR_MESSAGES[code] : undefined;
    if (friendly) return formError(friendly);

    console.error("[booking] create_booking_with_children failed", {
      eventId: event.id,
      code: rpcError.code,
      message: rpcError.message,
    });
    return formError(GENERIC_ERROR);
  }
  if (!booking) {
    console.error("[booking] RPC returned no booking", { eventId: event.id });
    return formError(GENERIC_ERROR);
  }

  // 3. Price guard. The Stripe line items below use the event row; the form
  //    shows the parent calculateTotal(). If the two ever disagree, refuse
  //    rather than charge an amount the parent wasn't shown.
  const childCount = data.children.length;
  const shownTotal = calculateTotal(childCount).subtotalPence;
  const chargedTotal =
    event.first_ticket_price_pence +
    (childCount - 1) * event.sibling_ticket_price_pence;
  if (shownTotal !== chargedTotal || booking.subtotal_pence !== chargedTotal) {
    console.error("[booking] price mismatch, refusing checkout", {
      bookingId: booking.id,
      eventId: event.id,
      shownTotal,
      chargedTotal,
      bookingSubtotal: booking.subtotal_pence,
    });
    await releaseHold(booking.id, "price_mismatch");
    return formError(
      "Our prices have just been updated. Please refresh the page and try again.",
    );
  }

  // 4. Stripe Checkout Session.
  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const sessionMinutes = Math.min(
    Math.max(env.BOOKING_HOLD_MINUTES, STRIPE_MIN_SESSION_MINUTES),
    STRIPE_MAX_SESSION_MINUTES,
  );

  const description = [
    event.subtitle,
    event.venue,
    formatEventDate(event.event_date),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "gbp",
        product_data: {
          name: `${event.name} — first child`,
          description,
        },
        unit_amount: event.first_ticket_price_pence,
      },
      quantity: 1,
    },
  ];
  if (childCount > 1) {
    lineItems.push({
      price_data: {
        currency: "gbp",
        product_data: { name: `${event.name} — sibling (20% off)` },
        unit_amount: event.sibling_ticket_price_pence,
      },
      quantity: childCount - 1,
    });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        currency: "gbp",
        customer_email: data.parentEmail,
        line_items: lineItems,
        // `{CHECKOUT_SESSION_ID}` is a Stripe template token; keep it literal.
        success_url: `${siteUrl}/studio-stars/book/booking-confirmation?booking=${booking.id}&session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/studio-stars/book?resume=${booking.id}`,
        metadata: { booking_id: booking.id, event_id: event.id },
        expires_at: Math.floor(Date.now() / 1000) + sessionMinutes * 60,
      },
      // A retry of the same booking can never create a second session.
      { idempotencyKey: `checkout-session-${booking.id}` },
    );
  } catch (err) {
    console.error("[booking] Stripe session creation failed", {
      bookingId: booking.id,
      eventId: event.id,
      message: err instanceof Error ? err.message : String(err),
    });
    await releaseHold(booking.id, "stripe_session_failed");
    return formError(
      "We couldn't start checkout just now. Please try again in a moment.",
    );
  }

  if (!session.url) {
    console.error("[booking] Stripe session has no URL", {
      bookingId: booking.id,
      sessionId: session.id,
    });
    await releaseHold(booking.id, "stripe_session_no_url");
    return formError(GENERIC_ERROR);
  }

  // 5. Link the session to the booking so the webhook and cron can find it.
  const { error: linkError } = await db
    .from("bookings")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", booking.id);

  if (linkError) {
    console.error("[booking] failed to save checkout session id", {
      bookingId: booking.id,
      sessionId: session.id,
      code: linkError.code,
      message: linkError.message,
    });
    // Don't send the parent to pay for a booking we can't reconcile.
    await stripe()
      .checkout.sessions.expire(session.id)
      .catch((err: unknown) => {
        console.error("[booking] failed to expire orphaned session", {
          bookingId: booking.id,
          sessionId: session.id,
          message: err instanceof Error ? err.message : String(err),
        });
      });
    await releaseHold(booking.id, "session_link_failed");
    return formError(GENERIC_ERROR);
  }

  // 6. Off to Stripe's hosted checkout (absolute https URL).
  return { ok: true, checkoutUrl: session.url };
}
