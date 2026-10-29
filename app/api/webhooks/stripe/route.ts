import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { calculateTotal } from "@/app/studio-stars/book/pricing";
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

  // Totals are recomputed server-side: what Stripe took must equal what we
  // priced (stored subtotal) and what calculateTotal says for this child count.
  const expectedPence = calculateTotal(booking.child_count).subtotalPence;
  if (
    session.amount_total !== booking.subtotal_pence ||
    booking.subtotal_pence !== expectedPence
  ) {
    // Money has been taken, so still confirm, but flag it for a human.
    console.error("[stripe-webhook] amount mismatch", {
      bookingId: booking.id,
      sessionId: session.id,
      amountTotal: session.amount_total,
      bookingSubtotal: booking.subtotal_pence,
      expectedPence,
    });
  }

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

  // TODO(phase-4): send confirmation email
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
