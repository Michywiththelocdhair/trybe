import type { BookingConfirmedEmailProps } from "@/lib/email/templates/booking-confirmed";
import type { DayOfEmailProps } from "@/lib/email/templates/day-of";
import type { Reminder48hEmailProps } from "@/lib/email/templates/reminder-48h";
import type { ReceiptEmailProps } from "@/lib/email/templates/receipt";
import type { ThankYouEmailProps } from "@/lib/email/templates/thank-you";
import { amountPaidPence } from "@/lib/booking/pricing";
import { formatLondonTime } from "@/lib/dates";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Loads a booking with its children and event, and maps them onto each email
 * template's props. Shared by the Stripe webhook (confirmation + receipt) and
 * the reminder cron, so a template prop change only needs adjusting here.
 *
 * eventDate stays a raw "YYYY-MM-DD"; the templates format it themselves.
 */

type Db = ReturnType<typeof supabaseService>;

export type BookingEmailData = {
  bookingId: string;
  recipientEmail: string;
  confirmation: BookingConfirmedEmailProps;
  receipt: ReceiptEmailProps;
  reminder48h: Reminder48hEmailProps;
  dayOf: DayOfEmailProps;
  thankYou: ThankYouEmailProps;
};

export async function loadBookingEmailData(
  db: Db,
  bookingId: string,
): Promise<BookingEmailData | null> {
  const bookingRes = await db
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingRes.error) throw new Error(`booking lookup failed: ${bookingRes.error.message}`);
  const booking = bookingRes.data;
  if (!booking) return null;

  const [eventRes, childrenRes] = await Promise.all([
    db.from("events").select("*").eq("id", booking.event_id).maybeSingle(),
    db
      .from("children")
      .select("first_name, age, position, scheduled_at")
      .eq("booking_id", booking.id)
      .order("position", { ascending: true }),
  ]);
  if (eventRes.error) throw new Error(`event lookup failed: ${eventRes.error.message}`);
  if (childrenRes.error) throw new Error(`children lookup failed: ${childrenRes.error.message}`);
  const event = eventRes.data;
  if (!event) return null;

  const kids = childrenRes.data ?? [];
  const paidPence = amountPaidPence(booking);
  const venue = event.venue ?? "";
  const venueAddress = event.venue_address ?? "";
  const childNames = kids.map((c) => c.first_name);
  const sessionTimes = kids
    .map((child) => formatLondonTime(child.scheduled_at))
    .filter(Boolean);

  return {
    bookingId: booking.id,
    recipientEmail: booking.parent_email,
    confirmation: {
      parentName: booking.parent_name,
      parentEmail: booking.parent_email,
      children: kids.map((c) => ({
        firstName: c.first_name,
        age: c.age,
        sessionTime: formatLondonTime(c.scheduled_at),
      })),
      eventName: event.name,
      eventSubtitle: event.subtitle ?? "",
      eventDate: event.event_date,
      venue,
      venueAddress,
      totalPence: paidPence,
      discountPence: booking.discount_pence,
      promoCode: booking.promo_code,
      bookingRef: booking.id,
    },
    receipt: {
      parentName: booking.parent_name,
      parentEmail: booking.parent_email,
      eventName: event.name,
      eventDate: event.event_date,
      venue,
      children: kids.map((c) => ({ firstName: c.first_name, position: c.position })),
      firstTicketPence: event.first_ticket_price_pence,
      siblingTicketPence: event.sibling_ticket_price_pence,
      discountPence: booking.discount_pence,
      promoCode: booking.promo_code,
      totalPence: paidPence,
      bookingRef: booking.id,
      confirmedAt: booking.confirmed_at ?? new Date().toISOString(),
    },
    reminder48h: {
      parentName: booking.parent_name,
      eventName: event.name,
      eventDate: event.event_date,
      venue,
      venueAddress,
      childNames,
      sessionTimes,
    },
    dayOf: {
      parentName: booking.parent_name,
      eventName: event.name,
      venue,
      venueAddress,
      childNames,
      sessionTimes,
    },
    thankYou: {
      parentName: booking.parent_name,
      eventName: event.name,
      childNames,
    },
  };
}
