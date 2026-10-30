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
  const summary = { reminders48h: 0, dayOf: 0, thankYou: 0 };

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

  if (errors.length > 0) {
    console.error("[cron:send-reminders] completed with errors", { count: errors.length });
  }

  return Response.json({ ...summary, errors });
}
