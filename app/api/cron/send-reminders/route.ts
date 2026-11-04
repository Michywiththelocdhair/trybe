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
import QRCode from "qrcode";
import {
  ChristmasFairAdminNotice,
  ChristmasFairReminderEmail,
  ChristmasFairTicketEmail,
  christmasFairAdminSubject,
  christmasFairReminderSubject,
  christmasFairTicketSubject,
  christmasFairTicketUrl,
  ChristmasFairVendorReceivedEmail,
  christmasFairVendorReceivedSubject,
} from "@/lib/email/templates/christmas-fair";
import { sendEmail } from "@/lib/email/send";

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

async function runChristmasFairEmails(db: Db, errors: string[]) {
  const eventResult = await db.from("events")
    .select("id, event_date, status")
    .eq("slug", "christmas-fair-2026")
    .maybeSingle();
  if (eventResult.error) throw new Error(`fair event query failed: ${eventResult.error.message}`);
  const event = eventResult.data;
  if (!event || event.status === "cancelled") return { confirmations: 0, reminders: 0, adminNotices: 0 };

  const [ticketResult, vendorResult] = await Promise.all([
    db.from("christmas_fair_tickets")
      .select("id, ticket_code, family_name, email, adult_count, child_count, confirmation_sent_at, reminder_sent_at, admin_notified_at")
      .eq("event_id", event.id).eq("status", "confirmed"),
    db.from("christmas_fair_vendors")
      .select("id, business_name, contact_name, email, category, admin_notified_at, applicant_confirmation_sent_at")
      .eq("event_id", event.id),
  ]);
  if (ticketResult.error) throw new Error(`fair tickets query failed: ${ticketResult.error.message}`);
  if (vendorResult.error) throw new Error(`fair vendors query failed: ${vendorResult.error.message}`);

  let confirmations = 0;
  let reminders = 0;
  let adminNotices = 0;
  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  for (const ticket of ticketResult.data ?? []) {
    const ticketUrl = christmasFairTicketUrl(ticket.ticket_code);
    if (!ticket.confirmation_sent_at) {
      try {
        const qr = await QRCode.toBuffer(ticketUrl, { type: "png", width: 440, margin: 1 });
        const result = await sendEmail({
          recipientEmail: ticket.email,
          subject: christmasFairTicketSubject(),
          component: ChristmasFairTicketEmail({
            familyName: ticket.family_name,
            email: ticket.email,
            adults: ticket.adult_count,
            children: ticket.child_count,
            ticketCode: ticket.ticket_code,
            eventDate: event.event_date,
            ticketUrl,
          }),
          attachments: [{ filename: "trybe-christmas-fair-ticket.png", content: qr, contentType: "image/png", contentId: "christmas-fair-ticket-qr" }],
        });
        if (result.sent) {
          confirmations += 1;
          await db.from("christmas_fair_tickets").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", ticket.id);
        } else errors.push(`fair ticket ${ticket.id}: ${result.error ?? "confirmation email failed"}`);
      } catch (err) {
        errors.push(`fair ticket ${ticket.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (!ticket.admin_notified_at) {
      const title = "New Christmas Fair family ticket";
      const result = await sendEmail({
        recipientEmail: "trybeappuk@gmail.com",
        subject: christmasFairAdminSubject(title),
        component: ChristmasFairAdminNotice({ title, lines: [`Family: ${ticket.family_name}`, `Email: ${ticket.email}`, `Party: ${ticket.adult_count} adults, ${ticket.child_count} children`], href: `${siteUrl}/admin/christmas-fair` }),
      });
      if (result.sent) {
        adminNotices += 1;
        await db.from("christmas_fair_tickets").update({ admin_notified_at: new Date().toISOString() }).eq("id", ticket.id);
      } else errors.push(`fair admin notice ${ticket.id}: ${result.error ?? "email failed"}`);
    }
    if (!ticket.reminder_sent_at && utcDate(1) === event.event_date) {
      const result = await sendEmail({
        recipientEmail: ticket.email,
        subject: christmasFairReminderSubject(),
        component: ChristmasFairReminderEmail({ familyName: ticket.family_name, adults: ticket.adult_count, children: ticket.child_count, eventDate: event.event_date, ticketUrl }),
      });
      if (result.sent) {
        reminders += 1;
        await db.from("christmas_fair_tickets").update({ reminder_sent_at: new Date().toISOString() }).eq("id", ticket.id);
      } else errors.push(`fair reminder ${ticket.id}: ${result.error ?? "email failed"}`);
    }
  }

  for (const vendor of vendorResult.data ?? []) {
    if (!vendor.applicant_confirmation_sent_at) {
      const receipt = await sendEmail({
        recipientEmail: vendor.email,
        subject: christmasFairVendorReceivedSubject(),
        component: ChristmasFairVendorReceivedEmail({ contactName: vendor.contact_name, businessName: vendor.business_name }),
      });
      if (receipt.sent) {
        await db.from("christmas_fair_vendors").update({ applicant_confirmation_sent_at: new Date().toISOString() }).eq("id", vendor.id);
      } else errors.push(`fair vendor receipt ${vendor.id}: ${receipt.error ?? "email failed"}`);
    }
    if (vendor.admin_notified_at) continue;
    const title = "New Christmas Fair vendor application";
    const result = await sendEmail({
      recipientEmail: "trybeappuk@gmail.com",
      subject: christmasFairAdminSubject(title),
      component: ChristmasFairAdminNotice({ title, lines: [`Business: ${vendor.business_name}`, `Contact: ${vendor.contact_name} (${vendor.email})`, `Category: ${vendor.category}`, "Review and respond in the admin dashboard."], href: `${siteUrl}/admin/christmas-fair` }),
    });
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
  const summary = { reminders48h: 0, dayOf: 0, thankYou: 0, fairConfirmations: 0, fairReminders: 0, fairAdminNotices: 0 };

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
