import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { loadBookingEmailData } from "@/lib/booking/email-data";
import { calculateTotal } from "@/lib/booking/pricing";
import { sendBookingEmail } from "@/lib/email/send";
import {
  BookingConfirmedEmail,
  bookingConfirmedSubject,
} from "@/lib/email/templates/booking-confirmed";
import { ReceiptEmail, receiptSubject } from "@/lib/email/templates/receipt";
import {
  StudioStarsAdminBookingEmail,
  studioStarsAdminBookingSubject,
} from "@/lib/email/templates/studio-stars-admin-booking";
import { requireEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Stripe webhook receiver.
 *
 *   400  missing/invalid signature (Stripe won't retry a 400 forever)
 *   500  config or database error (Stripe retries with backoff)
 *   200  handled, ignored, or a duplicate delivery
 *
 * Idempotency: each event id is inserted into stripe_webhook_events BEFORE it
 * is processed. A unique-violation means we've seen it, so we answer 200 and
 * stop. If processing then fails we delete the marker again, so Stripe's retry
 * is processed rather than swallowed as a "duplicate".
 *
 * Needs the raw body for signature verification, hence req.text().
 */

type Db = ReturnType<typeof supabaseService>;

const UNIQUE_VIOLATION = "23505";

/** Supabase errors are plain objects, not Errors; wrap so logs show code + message. */
function dbError(error: { code?: string; message: string }): Error {
  return new Error(`Supabase error ${error.code ?? "unknown"}: ${error.message}`);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  const body = await req.text();

  let client: Stripe;
  let secret: string;
  let db: Db;
  try {
    client = stripe();
    secret = requireEnv("STRIPE_WEBHOOK_SECRET");
    db = supabaseService();
  } catch (err) {
    console.error("[stripe-webhook] not configured", {
      message: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    // Never log the body or signature.
    console.warn("[stripe-webhook] signature verification failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: claim the event id.
  const { error: claimError } = await db
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type, payload: null });

  if (claimError) {
    if (claimError.code === UNIQUE_VIOLATION) {
      return Response.json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] failed to record event", {
      eventId: event.id,
      type: event.type,
      code: claimError.code,
      message: claimError.message,
    });
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  try {
    await handleEvent(db, event);
  } catch (err) {
    console.error("[stripe-webhook] handler failed", {
      eventId: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : String(err),
    });
    // Release the claim so Stripe's retry gets processed.
    const { error: releaseError } = await db
      .from("stripe_webhook_events")
      .delete()
      .eq("id", event.id);
    if (releaseError) {
      console.error("[stripe-webhook] failed to release event claim", {
        eventId: event.id,
        code: releaseError.code,
        message: releaseError.message,
      });
    }
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  return Response.json({ received: true });
}

async function handleEvent(db: Db, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    // Only fires if async payment methods are enabled in Stripe; harmless otherwise.
    case "checkout.session.async_payment_succeeded":
      await confirmBooking(db, event.data.object);
      return;
    case "checkout.session.expired":
      await expireBooking(db, event.data.object);
      return;
    case "charge.refunded":
      await refundBooking(db, event.data.object);
      return;
    default:
      // Unsubscribed/unknown event types are acknowledged and ignored.
      return;
  }
}

async function confirmBooking(
  db: Db,
  session: Stripe.Checkout.Session,
): Promise<void> {
  // Card payments are "paid" on completion. Anything else (async methods still
  // settling) is confirmed later by checkout.session.async_payment_succeeded.
  if (session.payment_status === "unpaid") {
    console.info("[stripe-webhook] session completed but unpaid, waiting", {
      sessionId: session.id,
    });
    return;
  }

  const columns = "id, status, child_count, subtotal_pence";

  // Primary link: the session id saved by createBookingSession.
  const bySession = await db
    .from("bookings")
    .select(columns)
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (bySession.error) throw dbError(bySession.error);
  let booking = bySession.data;

  // Fallback: the booking id we put in the session metadata.
  const metadataBookingId = session.metadata?.booking_id;
  if (!booking && metadataBookingId) {
    const byMetadata = await db
      .from("bookings")
      .select(columns)
      .eq("id", metadataBookingId)
      .maybeSingle();
    if (byMetadata.error) throw dbError(byMetadata.error);
    booking = byMetadata.data;
  }

  if (!booking) {
    // Retrying can't fix this; surface it loudly and acknowledge.
    console.error("[stripe-webhook] paid session has no matching booking", {
      sessionId: session.id,
      metadataBookingId,
    });
    return;
  }

  if (booking.status === "confirmed") return; // already handled

  if (booking.status === "cancelled" || booking.status === "refunded") {
    console.error("[stripe-webhook] payment received for a closed booking, needs manual refund", {
      bookingId: booking.id,
      status: booking.status,
      sessionId: session.id,
    });
    return;
  }

  // Totals are recomputed server-side: Stripe's pre-discount subtotal must
  // equal what we priced (stored subtotal) and what calculateTotal says for
  // this child count, and the amount taken must be that minus the discount.
  const expectedPence = calculateTotal(booking.child_count).subtotalPence;
  const discountPence = Math.max(session.total_details?.amount_discount ?? 0, 0);
  if (
    session.amount_subtotal !== booking.subtotal_pence ||
    session.amount_total !== booking.subtotal_pence - discountPence ||
    booking.subtotal_pence !== expectedPence
  ) {
    // Money has been taken, so still confirm, but flag it for a human.
    console.error("[stripe-webhook] amount mismatch", {
      bookingId: booking.id,
      sessionId: session.id,
      amountSubtotal: session.amount_subtotal,
      amountTotal: session.amount_total,
      discountPence,
      bookingSubtotal: booking.subtotal_pence,
      expectedPence,
    });
  }
  const promoCode = discountPence > 0 ? await promotionCodeFor(session) : null;

  if (booking.status === "expired") {
    // The hold lapsed before payment landed; capacity may have been re-sold.
    console.warn("[stripe-webhook] payment landed after hold expired, confirming anyway", {
      bookingId: booking.id,
      sessionId: session.id,
    });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const { data: updated, error } = await db
    .from("bookings")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      // Clamped so a surprising Stripe payload can't break the DB check.
      discount_pence: Math.min(discountPence, booking.subtotal_pence),
      promo_code: promoCode,
    })
    .eq("id", booking.id)
    .in("status", ["pending_payment", "expired"])
    .select("id");
  if (error) throw dbError(error);

  if (!updated || updated.length === 0) {
    // Status changed under us (e.g. admin cancelled). Nothing more to do.
    console.warn("[stripe-webhook] booking changed before confirmation", {
      bookingId: booking.id,
      sessionId: session.id,
    });
    return;
  }

  // The booking is confirmed and paid; emails are best effort from here. Never
  // throw: a failure would release the event claim and Stripe would retry a
  // webhook whose work is already done.
  await sendConfirmationEmails(db, booking.id);
}

/**
 * The customer-facing code (e.g. "STARS10") behind the session's discount.
 * Best effort: the booking is still confirmed, with the discount amount, if
 * Stripe can't be reached here.
 */
async function promotionCodeFor(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const ref = session.discounts?.find((d) => d.promotion_code)?.promotion_code;
  if (!ref) return null;
  if (typeof ref !== "string") return ref.code;
  try {
    return (await stripe().promotionCodes.retrieve(ref)).code;
  } catch (err) {
    console.warn("[stripe-webhook] could not look up promotion code", {
      sessionId: session.id,
      promotionCodeId: ref,
      message: err instanceof Error ? err.message : String(err),
    });
    return ref;
  }
}

async function sendConfirmationEmails(db: Db, bookingId: string): Promise<void> {
  try {
    const data = await loadBookingEmailData(db, bookingId);
    if (!data) {
      console.error("[stripe-webhook] no booking/event data for confirmation email", {
        bookingId,
      });
      return;
    }

    // sendBookingEmail is idempotent per (booking, template) and reports
    // failures in its result rather than throwing.
    const results = await Promise.allSettled([
      sendBookingEmail({
        bookingId,
        recipientEmail: data.recipientEmail,
        template: "confirmation",
        subject: bookingConfirmedSubject(data.confirmation),
        component: BookingConfirmedEmail(data.confirmation),
      }),
      sendBookingEmail({
        bookingId,
        recipientEmail: data.recipientEmail,
        template: "receipt",
        subject: receiptSubject(data.receipt),
        component: ReceiptEmail(data.receipt),
      }),
    ]);

    const templates = ["confirmation", "receipt"] as const;
    results.forEach((result, i) => {
      const message =
        result.status === "rejected"
          ? result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
          : result.value.error;
      if (message) {
        console.error("[stripe-webhook] email failed", {
          bookingId,
          template: templates[i],
          message,
        });
      }
    });

    const adminNotification = await sendBookingEmail({
      bookingId,
      recipientEmail: "trybeappuk@gmail.com",
      template: "admin_booking",
      subject: studioStarsAdminBookingSubject(data.confirmation),
      component: StudioStarsAdminBookingEmail(data.confirmation),
    });
    if (adminNotification.error) {
      console.error("[stripe-webhook] Studio Stars admin notification failed", {
        bookingId,
        message: adminNotification.error,
      });
    }
  } catch (err) {
    console.error("[stripe-webhook] could not send confirmation emails", {
      bookingId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function expireBooking(
  db: Db,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { error } = await db
    .from("bookings")
    .update({ status: "expired" })
    .eq("stripe_checkout_session_id", session.id)
    .eq("status", "pending_payment");
  if (error) throw dbError(error);
}

async function refundBooking(db: Db, charge: Stripe.Charge): Promise<void> {
  // charge.refunded fires for partial refunds too; only a full refund frees the seat.
  if (!charge.refunded) {
    console.info("[stripe-webhook] partial refund ignored", { chargeId: charge.id });
    return;
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) {
    console.error("[stripe-webhook] refunded charge has no payment intent", {
      chargeId: charge.id,
    });
    return;
  }

  const { error } = await db
    .from("bookings")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .neq("status", "refunded");
  if (error) throw dbError(error);
}
