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
import { formatLondonTime } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase/service";
import { formatPence } from "@/lib/christmas-fair/config";
import {
  sendFairAdminNotice,
  sendTicketConfirmation,
  sendVendorEmail,
  TICKET_EMAIL_COLUMNS,
  VENDOR_EMAIL_COLUMNS,
} from "@/lib/christmas-fair/emails";

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
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const kind = session.metadata?.kind;
      if (kind === "christmas_fair_ticket") await confirmFairTicket(db, session);
      else if (kind === "christmas_fair_vendor") await confirmFairVendor(db, session);
      else await confirmBooking(db, session);
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      if (session.metadata?.kind === "christmas_fair_ticket") await expireFairTicket(db, session);
      else if (session.metadata?.kind === "christmas_fair_vendor") return; // the approval window, not the session, governs vendors
      else await expireBooking(db, session);
      return;
    }
    case "charge.refunded":
      await refundBooking(db, event.data.object);
      await refundFairPayments(db, event.data.object);
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

  const columns = "id, event_id, status, child_count, subtotal_pence, internal_notes";

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

  // Unpaid checkouts don't hold slots, so another parent may have paid for
  // the same slot first. Money has been taken, so confirm, but flag it.
  const clashNote = await slotClashNote(db, booking.id, booking.event_id);
  if (clashNote) {
    console.error("[stripe-webhook] paid booking clashes with another paid booking", {
      bookingId: booking.id,
      sessionId: session.id,
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
      // Clamped so a surprising Stripe payload can't break the DB check.
      discount_pence: Math.min(discountPence, booking.subtotal_pence),
      promo_code: promoCode,
      ...(clashNote
        ? {
            internal_notes: booking.internal_notes
              ? `${clashNote}\n\n${booking.internal_notes}`
              : clashNote,
          }
        : {}),
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
  await sendConfirmationEmails(db, booking.id, clashNote);
}

/**
 * If any of this booking's child sessions is already taken by another PAID
 * booking for the same event, returns an admin-facing note describing it.
 */
async function slotClashNote(
  db: Db,
  bookingId: string,
  eventId: string,
): Promise<string | null> {
  const mine = await db
    .from("children")
    .select("scheduled_at")
    .eq("booking_id", bookingId)
    .not("scheduled_at", "is", null);
  if (mine.error) throw dbError(mine.error);
  const times = (mine.data ?? []).flatMap((c) => (c.scheduled_at ? [c.scheduled_at] : []));
  if (times.length === 0) return null;

  const paid = await db
    .from("bookings")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .neq("id", bookingId);
  if (paid.error) throw dbError(paid.error);
  const paidIds = (paid.data ?? []).map((b) => b.id);
  if (paidIds.length === 0) return null;

  const others = await db
    .from("children")
    .select("scheduled_at, booking_id")
    .in("booking_id", paidIds)
    .in("scheduled_at", times);
  if (others.error) throw dbError(others.error);
  const clashes = others.data ?? [];
  if (clashes.length === 0) return null;

  const when = [...new Set(clashes.map((c) => formatLondonTime(c.scheduled_at)))].join(", ");
  const refs = [...new Set(clashes.map((c) => c.booking_id.slice(0, 8).toUpperCase()))].join(", ");
  return `⚠️ SLOT CLASH: paid for ${when}, which another paid booking (${refs}) already has. Please contact this parent to move their session time.`;
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

async function sendConfirmationEmails(
  db: Db,
  bookingId: string,
  adminWarning: string | null,
): Promise<void> {
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
      subject: `${adminWarning ? "⚠️ Slot clash — " : ""}${studioStarsAdminBookingSubject(data.confirmation)}`,
      component: StudioStarsAdminBookingEmail({ ...data.confirmation, adminWarning }),
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

// ---------------------------------------------------------------------------
// Christmas Fair
// ---------------------------------------------------------------------------

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
}

async function confirmFairTicket(db: Db, session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status === "unpaid") return;
  const columns = `${TICKET_EMAIL_COLUMNS}, status, confirmation_sent_at, admin_notified_at, phone` as const;
  let { data: ticket, error } = await db.from("christmas_fair_tickets").select(columns).eq("stripe_checkout_session_id", session.id).maybeSingle();
  if (error) throw dbError(error);
  const metadataId = session.metadata?.ticket_id;
  if (!ticket && metadataId) {
    ({ data: ticket, error } = await db.from("christmas_fair_tickets").select(columns).eq("id", metadataId).maybeSingle());
    if (error) throw dbError(error);
  }
  if (!ticket) {
    console.error("[stripe-webhook] paid fair session has no matching ticket", { sessionId: session.id, metadataId });
    return;
  }
  if (ticket.status === "confirmed") return;
  if (ticket.status === "cancelled" || ticket.status === "refunded") {
    console.error("[stripe-webhook] payment received for a closed fair ticket, needs manual refund", { ticketId: ticket.id, sessionId: session.id });
    return;
  }
  const expected = ticket.minimum_donation_pence + ticket.extra_donation_pence;
  if (session.amount_total !== expected) {
    console.error("[stripe-webhook] fair ticket amount mismatch", { ticketId: ticket.id, amountTotal: session.amount_total, expected });
  }
  if (ticket.status === "expired") {
    console.warn("[stripe-webhook] fair payment landed after the hold expired, confirming anyway", { ticketId: ticket.id });
  }
  const { data: updated, error: updateError } = await db.from("christmas_fair_tickets").update({
    status: "confirmed",
    amount_paid_pence: session.amount_total ?? expected,
    paid_at: new Date().toISOString(),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentIdOf(session),
  }).eq("id", ticket.id).in("status", ["pending_payment", "expired"]).select("id");
  if (updateError) {
    // 23505: this family already has a confirmed ticket under the same email.
    if (updateError.code === UNIQUE_VIOLATION) {
      console.error("[stripe-webhook] duplicate paid fair ticket for one email, needs manual refund", { ticketId: ticket.id, sessionId: session.id });
      return;
    }
    throw dbError(updateError);
  }
  if (!updated || updated.length === 0) return;

  // Paid and confirmed: emails are best effort and must never throw.
  const paid = { ...ticket, amount_paid_pence: session.amount_total ?? expected };
  const confirmation = await sendTicketConfirmation(paid, db);
  if (!confirmation.sent) console.error("[stripe-webhook] fair ticket email failed", { ticketId: ticket.id, error: confirmation.error });
  const notice = await sendFairAdminNotice("New Christmas Fair family ticket", [
    `Family: ${ticket.family_name}`,
    `Email: ${ticket.email}${ticket.phone ? ` · ${ticket.phone}` : ""}`,
    `Party: ${ticket.adult_count} adults, ${ticket.child_count} children`,
    `Donation paid: ${formatPence(paid.amount_paid_pence)}${ticket.extra_donation_pence > 0 ? ` (including ${formatPence(ticket.extra_donation_pence)} extra)` : ""}`,
  ], { kind: "christmas_fair_ticket", id: ticket.id });
  if (notice.sent) await db.from("christmas_fair_tickets").update({ admin_notified_at: new Date().toISOString() }).eq("id", ticket.id);
}

async function expireFairTicket(db: Db, session: Stripe.Checkout.Session): Promise<void> {
  const { error } = await db.from("christmas_fair_tickets").update({ status: "expired" })
    .eq("stripe_checkout_session_id", session.id).eq("status", "pending_payment");
  if (error) throw dbError(error);
}

async function confirmFairVendor(db: Db, session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status === "unpaid") return;
  const vendorId = session.metadata?.vendor_id;
  const columns = `${VENDOR_EMAIL_COLUMNS}, status, phone` as const;
  let { data: vendor, error } = await db.from("christmas_fair_vendors").select(columns).eq("stripe_checkout_session_id", session.id).maybeSingle();
  if (error) throw dbError(error);
  if (!vendor && vendorId) {
    ({ data: vendor, error } = await db.from("christmas_fair_vendors").select(columns).eq("id", vendorId).maybeSingle());
    if (error) throw dbError(error);
  }
  if (!vendor) {
    console.error("[stripe-webhook] paid vendor session has no matching vendor", { sessionId: session.id, vendorId });
    return;
  }
  if (vendor.status === "paid") return;
  if (vendor.status !== "approved" && vendor.status !== "expired") {
    console.error("[stripe-webhook] vendor paid while not approved, needs manual review/refund", { vendorId: vendor.id, status: vendor.status, sessionId: session.id });
    return;
  }
  if (vendor.status === "expired") {
    console.warn("[stripe-webhook] vendor paid after their window closed, confirming anyway", { vendorId: vendor.id });
  }
  const amount = session.amount_total ?? vendor.table_price_pence ?? 0;
  const { data: updated, error: updateError } = await db.from("christmas_fair_vendors").update({
    status: "paid",
    amount_paid_pence: amount,
    paid_at: new Date().toISOString(),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentIdOf(session),
  }).eq("id", vendor.id).in("status", ["approved", "expired"]).select("id");
  if (updateError) throw dbError(updateError);
  if (!updated || updated.length === 0) return;

  const paid = { ...vendor, amount_paid_pence: amount };
  const sent = await sendVendorEmail("fair_vendor_paid", paid, db);
  if (!sent.sent) console.error("[stripe-webhook] vendor paid email failed", { vendorId: vendor.id, error: sent.error });
  await sendFairAdminNotice("Christmas Fair vendor table paid", [
    `Business: ${vendor.business_name}`,
    `Contact: ${vendor.contact_name} (${vendor.email}${vendor.phone ? `, ${vendor.phone}` : ""})`,
    `Paid: ${formatPence(amount)}`,
  ], { kind: "christmas_fair_vendor", id: vendor.id });
}

async function refundFairPayments(db: Db, charge: Stripe.Charge): Promise<void> {
  if (!charge.refunded) return;
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const [tickets, vendors] = await Promise.all([
    db.from("christmas_fair_tickets").update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId).neq("status", "refunded"),
    db.from("christmas_fair_vendors").update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId).neq("status", "refunded"),
  ]);
  if (tickets.error) throw dbError(tickets.error);
  if (vendors.error) throw dbError(vendors.error);
}
