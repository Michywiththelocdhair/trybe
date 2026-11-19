import "server-only";
import type * as React from "react";
import { Resend, type Attachment } from "resend";
import { render } from "@react-email/components";
import { env, requireEnv } from "@/lib/env";
import { supabaseService } from "@/lib/supabase/service";
import type { EmailTemplate } from "@/lib/supabase/types";

export type { EmailTemplate };

let cachedResend: Resend | null = null;
function resend(): Resend {
  if (!cachedResend) cachedResend = new Resend(requireEnv("RESEND_API_KEY"));
  return cachedResend;
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

async function deliver(opts: {
  recipientEmail: string;
  subject: string;
  component: React.ReactElement;
  attachments?: Attachment[];
}): Promise<{ messageId?: string; error?: string; html?: string }> {
  let html: string | undefined;
  try {
    html = await render(opts.component);
    const text = await render(opts.component, { plainText: true });
    const { data, error } = await resend().emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: opts.recipientEmail,
      subject: opts.subject,
      html,
      text,
      attachments: opts.attachments,
    });
    if (error) return { error: error.message ?? errMessage(error), html };
    return { messageId: data?.id, html };
  } catch (e) {
    return { error: errMessage(e), html };
  }
}

/**
 * Send a booking-related email exactly once per (bookingId, template).
 *
 * - A successful earlier send => skipped ({ sent: false }, no error).
 * - An earlier FAILED attempt (email_log.error set) is retried, and its row is
 *   updated in place, because the unique index would otherwise block the log.
 */
export async function sendBookingEmail(opts: {
  bookingId: string;
  recipientEmail: string;
  template: EmailTemplate;
  subject: string;
  component: React.ReactElement;
}): Promise<{ sent: boolean; error?: string }> {
  const db = supabaseService();

  // 1. Idempotency check.
  const { data: existing, error: lookupError } = await db
    .from("email_log")
    .select("id, error")
    .eq("booking_id", opts.bookingId)
    .eq("template", opts.template)
    .maybeSingle();

  if (lookupError) {
    return { sent: false, error: `email_log lookup failed: ${lookupError.message}` };
  }
  if (existing && !existing.error) return { sent: false };

  // 2-3. Render + send.
  const result = await deliver(opts);

  // 4-5. Record the outcome.
  const row = {
    booking_id: opts.bookingId,
    recipient_email: opts.recipientEmail,
    template: opts.template,
    resend_message_id: result.messageId ?? null,
    error: result.error ?? null,
    sent_at: new Date().toISOString(),
    subject: opts.subject,
    html: result.html ?? null,
    related_kind: "booking",
    related_id: opts.bookingId,
  };

  const { error: logError } = existing
    ? await db.from("email_log").update(row).eq("id", existing.id)
    : await db.from("email_log").insert(row);

  // 23505 = concurrent sender logged first; the email itself already went out.
  if (logError && logError.code !== "23505") {
    console.error("[email] failed to write email_log", logError);
  }

  if (result.error) return { sent: false, error: result.error };
  return { sent: true };
}

/** Send an email that isn't tied to a booking (e.g. waitlist). No idempotency. */
export async function sendEmail(opts: {
  recipientEmail: string;
  subject: string;
  component: React.ReactElement;
  attachments?: Attachment[];
}): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const result = await deliver(opts);
  if (result.error) return { sent: false, error: result.error };
  return { sent: true, messageId: result.messageId };
}

/**
 * Send an email and record it in email_log (with a copy of the HTML) so admins
 * can see exactly what went out. Not idempotent: callers track their own
 * "already sent" timestamps. Never throws.
 */
export async function sendLoggedEmail(opts: {
  recipientEmail: string;
  subject: string;
  component: React.ReactElement;
  attachments?: Attachment[];
  template: EmailTemplate;
  relatedKind?: string;
  relatedId?: string;
}): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const result = await deliver(opts);
  try {
    const { error } = await supabaseService().from("email_log").insert({
      booking_id: null,
      recipient_email: opts.recipientEmail,
      template: opts.template,
      resend_message_id: result.messageId ?? null,
      error: result.error ?? null,
      subject: opts.subject,
      html: result.html ?? null,
      related_kind: opts.relatedKind ?? null,
      related_id: opts.relatedId ?? null,
    });
    if (error) console.error("[email] failed to write email_log", error);
  } catch (err) {
    console.error("[email] failed to write email_log", err);
  }
  if (result.error) return { sent: false, error: result.error };
  return { sent: true, messageId: result.messageId };
}
