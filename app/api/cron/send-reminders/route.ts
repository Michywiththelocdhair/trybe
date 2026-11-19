import { timingSafeEqual } from "node:crypto";
import type { ReactElement } from "react";
import type { NextRequest } from "next/server";
import { type BookingEmailData, loadBookingEmailData } from "@/lib/booking/email-data";
import { env } from "@/lib/env";
import { type EmailTemplate, sendBookingEmail } from "@/lib/email/send";
import { DayOfEmail, dayOfSubject } from "@/lib/email/templates/day-of";
import {
  Reminder48hEmail,
  reminder48hSubject,
} from "@/lib/email/templates/reminder-48h";
import { ThankYouEmail, thankYouSubject } from "@/lib/email/templates/thank-you";
import { supabaseService } from "@/lib/supabase/service";
import { FAIR, vendorCategoryLabel } from "@/lib/christmas-fair/config";
import {
  sendFairAdminNotice,
  sendTicketConfirmation,
  sendTicketReminder,
  sendVendorEmail,
  TICKET_EMAIL_COLUMNS,
  VENDOR_EMAIL_COLUMNS,
} from "@/lib/christmas-fair/emails";
import {
  StudioStarsAdminBookingEmail,
  studioStarsAdminBookingSubject,
} from "@/lib/email/templates/studio-stars-admin-booking";

/**
 * Vercel Cron (daily 07:00 UTC, see vercel.json). Sends the scheduled emails:
 *
 *   reminder_48h  confirmed bookings for events 2 days away
 *   day_of        confirmed bookings for events today
 *   thank_you     confirmed bookings for events that were yesterday
 *
 * Idempotent: bookings that already have a successful email_log row are
 * skipped here, and sendBookingEmail re-checks before every send. A failed
 * earlier attempt is retried on the next run.
 *
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is set.
 */

type Db = ReturnType<typeof supabaseService>;
type Data = BookingEmailData;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** "YYYY-MM-DD" for today (UTC) shifted by `offsetDays`. */
function utcDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

type Job = {
  key: "reminders48h" | "dayOf" | "thankYou";
  template: EmailTemplate;
  dayOffset: number;
  subject: (d: Data) => string;
  render: (d: Data) => ReactElement;
};

const JOBS: Job[] = [
  {
    key: "reminders48h",
    template: "reminder_48h",
    dayOffset: 2,
    subject: (d) => reminder48hSubject(d.reminder48h),
    render: (d) => Reminder48hEmail(d.reminder48h),
  },
  {
    key: "dayOf",
    template: "day_of",
    dayOffset: 0,
    subject: (d) => dayOfSubject(d.dayOf),
    render: (d) => DayOfEmail(d.dayOf),
  },
  {
    key: "thankYou",
    template: "thank_you",
    dayOffset: -1,
    subject: (d) => thankYouSubject(d.thankYou),
    render: (d) => ThankYouEmail(d.thankYou),
  },
];

async function runJob(db: Db, job: Job, errors: string[]): Promise<number> {
  const date = utcDate(job.dayOffset);

  const events = await db
    .from("events")
    .select("id")
    .eq("event_date", date)
    .neq("status", "cancelled");
  if (events.error) throw new Error(`events query failed: ${events.error.message}`);
  const eventIds = (events.data ?? []).map((e) => e.id);
  if (eventIds.length === 0) return 0;

  const bookings = await db
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .in("event_id", eventIds);
  if (bookings.error) throw new Error(`bookings query failed: ${bookings.error.message}`);
  const bookingIds = (bookings.data ?? []).map((b) => b.id);
  if (bookingIds.length === 0) return 0;

  // Skip bookings already emailed successfully (failed rows are retried).
  const logged = await db
    .from("email_log")
    .select("booking_id")
    .eq("template", job.template)
    .is("error", null)
    .in("booking_id", bookingIds);
  if (logged.error) throw new Error(`email_log query failed: ${logged.error.message}`);
  const done = new Set((logged.data ?? []).map((r) => r.booking_id));

  let sent = 0;
  for (const bookingId of bookingIds) {
    if (done.has(bookingId)) continue;
    try {
      const data = await loadBookingEmailData(db, bookingId);
      if (!data) {
        errors.push(`${job.template} ${bookingId}: booking or event not found`);
        continue;
      }
      const result = await sendBookingEmail({
        bookingId,
        recipientEmail: data.recipientEmail,
        template: job.template,
        subject: job.subject(data),
        component: job.render(data),
      });
      if (result.error) errors.push(`${job.template} ${bookingId}: ${result.error}`);
      else if (result.sent) sent += 1;
    } catch (err) {
      errors.push(
        `${job.template} ${bookingId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return sent;
}

async function runStudioStarsAdminBookingNotices(db: Db, errors: string[]) {
  const eventResult = await db.from("events").select("id").eq("slug", "studio-stars-2026-12").maybeSingle();
  if (eventResult.error) throw new Error(`Studio Stars event lookup failed: ${eventResult.error.message}`);
  if (!eventResult.data) return 0;

  const bookings = await db.from("bookings").select("id").eq("event_id", eventResult.data.id).eq("status", "confirmed");
  if (bookings.error) throw new Error(`Studio Stars bookings lookup failed: ${bookings.error.message}`);

  let sent = 0;
  for (const booking of bookings.data ?? []) {
    try {
      const data = await loadBookingEmailData(db, booking.id);
      if (!data) continue;
      const result = await sendBookingEmail({
        bookingId: booking.id,
        recipientEmail: "trybeappuk@gmail.com",
        template: "admin_booking",
        subject: studioStarsAdminBookingSubject(data.confirmation),
        component: StudioStarsAdminBookingEmail(data.confirmation),
      });
      if (result.error) errors.push(`admin_booking ${booking.id}: ${result.error}`);
      else if (result.sent) sent += 1;
    } catch (err) {
      errors.push(`admin_booking ${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return sent;
}

async function runChristmasFairEmails(db: Db, errors: string[]) {
  const eventResult = await db.from("events")
    .select("id, event_date, status")
    .eq("slug", FAIR.slug)
    .maybeSingle();
  if (eventResult.error) throw new Error(`fair event query failed: ${eventResult.error.message}`);
  const event = eventResult.data;
  if (!event || event.status === "cancelled") return { confirmations: 0, reminders: 0, adminNotices: 0 };

  const [ticketResult, vendorResult] = await Promise.all([
    db.from("christmas_fair_tickets")
      .select(`${TICKET_EMAIL_COLUMNS}, phone, confirmation_sent_at, reminder_sent_at, admin_notified_at`)
      .eq("event_id", event.id).eq("status", "confirmed"),
    db.from("christmas_fair_vendors")
      .select(`${VENDOR_EMAIL_COLUMNS}, status, phone, needs_power, approved_at, admin_notified_at, applicant_confirmation_sent_at, decision_email_sent_at, payment_confirmation_sent_at`)
      .eq("event_id", event.id),
  ]);
  if (ticketResult.error) throw new Error(`fair tickets query failed: ${ticketResult.error.message}`);
  if (vendorResult.error) throw new Error(`fair vendors query failed: ${vendorResult.error.message}`);

  let confirmations = 0;
  let reminders = 0;
  let adminNotices = 0;
  for (const ticket of ticketResult.data ?? []) {
    // Paid tickets are emailed by the Stripe webhook; this retries failures.
    // Tickets issued free (before entry donations) already had theirs.
    if (!ticket.confirmation_sent_at) {
      const result = await sendTicketConfirmation(ticket, db);
      if (result.sent) confirmations += 1;
      else errors.push(`fair ticket ${ticket.id}: ${result.error ?? "confirmation email failed"}`);
    }
    if (!ticket.admin_notified_at) {
      const result = await sendFairAdminNotice("New Christmas Fair family ticket", [
        `Family: ${ticket.family_name}`,
        `Email: ${ticket.email}${ticket.phone ? ` · ${ticket.phone}` : ""}`,
        `Party: ${ticket.adult_count} adults, ${ticket.child_count} children`,
      ], { kind: "christmas_fair_ticket", id: ticket.id });
      if (result.sent) {
        adminNotices += 1;
        await db.from("christmas_fair_tickets").update({ admin_notified_at: new Date().toISOString() }).eq("id", ticket.id);
      } else errors.push(`fair admin notice ${ticket.id}: ${result.error ?? "email failed"}`);
    }
    if (!ticket.reminder_sent_at && utcDate(1) === event.event_date) {
      const result = await sendTicketReminder(ticket, db);
      if (result.sent) reminders += 1;
      else errors.push(`fair reminder ${ticket.id}: ${result.error ?? "email failed"}`);
    }
  }

  for (const vendor of vendorResult.data ?? []) {
    // Retries for emails that failed when they were first triggered.
    if (!vendor.applicant_confirmation_sent_at) {
      const result = await sendVendorEmail("fair_vendor_received", vendor, db);
      if (!result.sent) errors.push(`fair vendor receipt ${vendor.id}: ${result.error ?? "email failed"}`);
    }
    if (!vendor.decision_email_sent_at && vendor.status === "approved" && vendor.approved_at && vendor.payment_due_at && Date.parse(vendor.payment_due_at) > Date.now()) {
      const result = await sendVendorEmail("fair_vendor_approved", vendor, db);
      if (!result.sent) errors.push(`fair vendor approval ${vendor.id}: ${result.error ?? "email failed"}`);
    }
    if (!vendor.decision_email_sent_at && vendor.status === "declined") {
      const result = await sendVendorEmail("fair_vendor_declined", vendor, db);
      if (!result.sent) errors.push(`fair vendor decline ${vendor.id}: ${result.error ?? "email failed"}`);
    }
    if (!vendor.payment_confirmation_sent_at && vendor.status === "paid") {
      const result = await sendVendorEmail("fair_vendor_paid", vendor, db);
      if (!result.sent) errors.push(`fair vendor paid ${vendor.id}: ${result.error ?? "email failed"}`);
    }
    if (vendor.admin_notified_at) continue;
    const result = await sendFairAdminNotice("New Christmas Fair vendor application", [
      `Business: ${vendor.business_name}`,
      `Contact: ${vendor.contact_name} (${vendor.email}, ${vendor.phone})`,
      `Stall: ${vendorCategoryLabel(vendor.category)}`,
      `Power needed: ${vendor.needs_power ? "Yes" : "No"}`,
      "Approve or decline it in the admin dashboard.",
    ], { kind: "christmas_fair_vendor", id: vendor.id });
    if (result.sent) {
      adminNotices += 1;
      await db.from("christmas_fair_vendors").update({ admin_notified_at: new Date().toISOString() }).eq("id", vendor.id);
    } else errors.push(`fair vendor notice ${vendor.id}: ${result.error ?? "email failed"}`);
  }
  return { confirmations, reminders, adminNotices };
}

export async function GET(req: NextRequest) {
  // Read the request FIRST. With Cache Components a GET handler that returns
  // before touching the request can be prerendered at build time and frozen.
  const authorization = req.headers.get("authorization") ?? "";

  const secret = env.CRON_SECRET;
  if (!secret) {
    // Fail closed: never compare against "Bearer undefined".
    console.error("[cron:send-reminders] CRON_SECRET is not set");
    return Response.json({ error: "Cron is not configured" }, { status: 500 });
  }
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let db: Db;
  try {
    db = supabaseService();
  } catch (err) {
    console.error("[cron:send-reminders] database not configured", {
      message: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  const errors: string[] = [];
  const summary = { reminders48h: 0, dayOf: 0, thankYou: 0, studioStarsAdminNotices: 0, fairConfirmations: 0, fairReminders: 0, fairAdminNotices: 0 };

  // The three jobs are independent; one failing must not block the others.
  const results = await Promise.allSettled(
    JOBS.map((job) => runJob(db, job, errors)),
  );
  results.forEach((result, i) => {
    const job = JOBS[i];
    if (result.status === "fulfilled") {
      summary[job.key] = result.value;
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error("[cron:send-reminders] job failed", { template: job.template, message });
      errors.push(`${job.template}: ${message}`);
    }
  });

  try {
    summary.studioStarsAdminNotices = await runStudioStarsAdminBookingNotices(db, errors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron:send-reminders] Studio Stars admin email job failed", { message });
    errors.push(`studio_stars_admin: ${message}`);
  }

  try {
    const fair = await runChristmasFairEmails(db, errors);
    summary.fairConfirmations = fair.confirmations;
    summary.fairReminders = fair.reminders;
    summary.fairAdminNotices = fair.adminNotices;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron:send-reminders] Christmas Fair email job failed", { message });
    errors.push(`christmas_fair: ${message}`);
  }

  if (errors.length > 0) {
    console.error("[cron:send-reminders] completed with errors", { count: errors.length });
  }

  return Response.json({ ...summary, errors });
}
