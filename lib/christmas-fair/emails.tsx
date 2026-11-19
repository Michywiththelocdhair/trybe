import "server-only";
import * as React from "react";
import QRCode from "qrcode";
import { Img, Text, render } from "@react-email/components";
import { sendLoggedEmail } from "@/lib/email/send";
import { EDITABLE_TEMPLATES, fillPlaceholders, type EditableTemplateCopy } from "@/lib/email/editable-templates";
import { FairEditableEmail } from "@/lib/email/templates/fair-editable";
import { ChristmasFairAdminNotice } from "@/lib/email/templates/christmas-fair";
import { Card, DetailRow, firstName, getSiteUrl, p } from "@/lib/email/templates/shared";
import { supabaseService } from "@/lib/supabase/service";
import type { Database, EditableEmailKey } from "@/lib/supabase/types";
import { FAIR, formatLondonDeadline, formatPence, vendorCategoryLabel } from "./config";

type Db = ReturnType<typeof supabaseService>;
type TicketRow = Database["public"]["Tables"]["christmas_fair_tickets"]["Row"];
type VendorRow = Database["public"]["Tables"]["christmas_fair_vendors"]["Row"];

export type FairTicketEmailData = Pick<TicketRow, "id" | "family_name" | "email" | "adult_count" | "child_count" | "ticket_code" | "amount_paid_pence" | "minimum_donation_pence" | "extra_donation_pence">;
export type FairVendorEmailData = Pick<VendorRow, "id" | "contact_name" | "business_name" | "email" | "category" | "access_token" | "table_price_pence" | "payment_due_at" | "amount_paid_pence">;

const QR_CID = "christmas-fair-ticket-qr";
const VENUE_LINE = `${FAIR.venue}, ${FAIR.address}`;

export function fairTicketUrl(ticketCode: string) {
  return `${getSiteUrl()}/christmas-fair/ticket/${encodeURIComponent(ticketCode)}`;
}

export function fairVendorUrl(accessToken: string) {
  return `${getSiteUrl()}/christmas-fair/vendor/${encodeURIComponent(accessToken)}`;
}

/** The saved copy for a template, or its default if it hasn't been edited. */
export async function loadTemplateCopy(key: EditableEmailKey, db: Db = supabaseService()): Promise<EditableTemplateCopy & { edited: boolean; updatedAt: string | null }> {
  const fallback = EDITABLE_TEMPLATES[key];
  try {
    const { data } = await db.from("email_templates").select("subject, heading, body, button_label, updated_at").eq("key", key).maybeSingle();
    if (data) return { subject: data.subject, heading: data.heading, body: data.body, buttonLabel: data.button_label, edited: true, updatedAt: data.updated_at };
  } catch (err) {
    console.error("[christmas-fair] could not load email template", { key, message: err instanceof Error ? err.message : String(err) });
  }
  return { subject: fallback.subject, heading: fallback.heading, body: fallback.body, buttonLabel: fallback.buttonLabel, edited: false, updatedAt: null };
}

const eventValues = {
  event_date: FAIR.dateLabel,
  event_time: FAIR.timeLabel,
  venue: VENUE_LINE,
};

function ticketAmount(ticket: FairTicketEmailData): number {
  return ticket.amount_paid_pence ?? ticket.minimum_donation_pence + ticket.extra_donation_pence;
}

function familySize(ticket: FairTicketEmailData) {
  return `${ticket.adult_count} ${ticket.adult_count === 1 ? "adult" : "adults"} · ${ticket.child_count} ${ticket.child_count === 1 ? "child" : "children"}`;
}

function ticketValues(ticket: FairTicketEmailData): Record<string, string> {
  return {
    ...eventValues,
    first_name: firstName(ticket.family_name),
    family_name: ticket.family_name,
    adults: String(ticket.adult_count),
    children: String(ticket.child_count),
    amount_paid: formatPence(ticketAmount(ticket)),
  };
}

function vendorValues(vendor: FairVendorEmailData): Record<string, string> {
  return {
    ...eventValues,
    first_name: firstName(vendor.contact_name),
    contact_name: vendor.contact_name,
    business_name: vendor.business_name,
    setup_time: FAIR.setUpLabel,
    packdown_time: FAIR.packDownLabel,
    table_price: vendor.table_price_pence ? formatPence(vendor.table_price_pence) : "your table fee",
    payment_deadline: vendor.payment_due_at ? formatLondonDeadline(vendor.payment_due_at) : "the date in this email",
    amount_paid: formatPence(vendor.amount_paid_pence ?? vendor.table_price_pence ?? 0),
  };
}

type Built = { subject: string; component: React.ReactElement };

function build(copy: EditableTemplateCopy, values: Record<string, string>, buttonHref: string | null, details: React.ReactNode, preview: string): Built {
  const subject = fillPlaceholders(copy.subject, values);
  return {
    subject,
    component: (
      <FairEditableEmail
        previewText={preview}
        heading={fillPlaceholders(copy.heading, values)}
        body={fillPlaceholders(copy.body, values)}
        buttonLabel={copy.buttonLabel ? fillPlaceholders(copy.buttonLabel, values) : null}
        buttonHref={buttonHref}
        details={details}
      />
    ),
  };
}

export function buildTicketEmail(key: "fair_ticket_confirmation" | "fair_ticket_reminder", copy: EditableTemplateCopy, ticket: FairTicketEmailData, qrSrc = `cid:${QR_CID}`): Built {
  const values = ticketValues(ticket);
  const details = (
    <Card>
      <DetailRow label="When" value={`${FAIR.dateLabel} · ${FAIR.timeLabel}, arrive any time`} />
      <DetailRow label="Where" value={`${VENUE_LINE} (${FAIR.directions.toLowerCase()})`} />
      <DetailRow label="Family size" value={familySize(ticket)} />
      {key === "fair_ticket_confirmation" ? (
        <>
          <DetailRow label="Entry donation" value={`${formatPence(ticketAmount(ticket))}, all going to Acres’ Christmas Day dinner`} />
          <Text style={{ ...p, textAlign: "center", marginTop: 24, fontWeight: 800 }}>Your entry QR code</Text>
          <Img src={qrSrc} alt={`QR code for ticket ${ticket.ticket_code.slice(0, 8).toUpperCase()}`} width="220" height="220" style={{ display: "block", margin: "0 auto" }} />
        </>
      ) : null}
      <Text style={{ ...p, textAlign: "center", fontWeight: 800, marginBottom: 0 }}>Ticket code: {ticket.ticket_code.slice(0, 8).toUpperCase()}</Text>
    </Card>
  );
  const preview = key === "fair_ticket_confirmation" ? "Your family ticket and QR code for the Trybe Christmas Fair." : "See you tomorrow at the Trybe Christmas Fair.";
  return build(copy, values, fairTicketUrl(ticket.ticket_code), details, preview);
}

export function buildVendorEmail(key: "fair_vendor_received" | "fair_vendor_approved" | "fair_vendor_declined" | "fair_vendor_paid", copy: EditableTemplateCopy, vendor: FairVendorEmailData): Built {
  const values = vendorValues(vendor);
  let details: React.ReactNode = null;
  if (key === "fair_vendor_received") {
    details = (
      <Card>
        <DetailRow label="Business" value={vendor.business_name} />
        <DetailRow label="Stall type" value={vendorCategoryLabel(vendor.category)} />
        <DetailRow label="Fair" value={`${FAIR.dateLabel} · ${FAIR.timeLabel} · ${VENUE_LINE}`} />
      </Card>
    );
  } else if (key === "fair_vendor_approved") {
    details = (
      <Card>
        <DetailRow label="Table price" value={values.table_price} />
        <DetailRow label="Pay by" value={values.payment_deadline} />
        <DetailRow label="Where" value={VENUE_LINE} />
        <DetailRow label="Set-up and pack-down" value={`Set up from ${FAIR.setUpLabel} · fair ${FAIR.timeLabel} · packed down by ${FAIR.packDownLabel}`} />
      </Card>
    );
  } else if (key === "fair_vendor_paid") {
    details = (
      <Card>
        <DetailRow label="Amount paid" value={values.amount_paid} />
        <DetailRow label="When" value={`${FAIR.dateLabel} · ${FAIR.timeLabel}`} />
        <DetailRow label="Where" value={`${VENUE_LINE} (${FAIR.directions.toLowerCase()})`} />
        <DetailRow label="Set-up and pack-down" value={`From ${FAIR.setUpLabel} · packed down by ${FAIR.packDownLabel}`} />
      </Card>
    );
  }
  const hasButton = EDITABLE_TEMPLATES[key].hasButton;
  const preview = {
    fair_vendor_received: "We’ve received your Christmas Fair vendor application.",
    fair_vendor_approved: "You’re approved. Book and pay for your table.",
    fair_vendor_declined: "An update on your Christmas Fair application.",
    fair_vendor_paid: "Your Christmas Fair table is booked.",
  }[key];
  return build(copy, values, hasButton ? fairVendorUrl(vendor.access_token) : null, details, preview);
}

// ---------------------------------------------------------------------------
// Senders. Each records the email in email_log, stamps the matching *_sent_at
// column on success and never throws.
// ---------------------------------------------------------------------------

type SendResult = { sent: boolean; error?: string };

function failure(err: unknown): SendResult {
  return { sent: false, error: err instanceof Error ? err.message : String(err) };
}

export async function sendTicketConfirmation(ticket: FairTicketEmailData, db: Db = supabaseService()): Promise<SendResult> {
  try {
    const copy = await loadTemplateCopy("fair_ticket_confirmation", db);
    const { subject, component } = buildTicketEmail("fair_ticket_confirmation", copy, ticket);
    const qr = await QRCode.toBuffer(fairTicketUrl(ticket.ticket_code), { type: "png", width: 440, margin: 1 });
    const result = await sendLoggedEmail({
      recipientEmail: ticket.email,
      subject,
      component,
      template: "fair_ticket_confirmation",
      relatedKind: "christmas_fair_ticket",
      relatedId: ticket.id,
      attachments: [{ filename: "trybe-christmas-fair-ticket.png", content: qr, contentType: "image/png", contentId: QR_CID }],
    });
    if (result.sent) await db.from("christmas_fair_tickets").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", ticket.id);
    return result;
  } catch (err) {
    return failure(err);
  }
}

export async function sendTicketReminder(ticket: FairTicketEmailData, db: Db = supabaseService()): Promise<SendResult> {
  try {
    const copy = await loadTemplateCopy("fair_ticket_reminder", db);
    const { subject, component } = buildTicketEmail("fair_ticket_reminder", copy, ticket);
    const result = await sendLoggedEmail({ recipientEmail: ticket.email, subject, component, template: "fair_ticket_reminder", relatedKind: "christmas_fair_ticket", relatedId: ticket.id });
    if (result.sent) await db.from("christmas_fair_tickets").update({ reminder_sent_at: new Date().toISOString() }).eq("id", ticket.id);
    return result;
  } catch (err) {
    return failure(err);
  }
}

const VENDOR_STAMP: Record<"fair_vendor_received" | "fair_vendor_approved" | "fair_vendor_declined" | "fair_vendor_paid", "applicant_confirmation_sent_at" | "decision_email_sent_at" | "payment_confirmation_sent_at"> = {
  fair_vendor_received: "applicant_confirmation_sent_at",
  fair_vendor_approved: "decision_email_sent_at",
  fair_vendor_declined: "decision_email_sent_at",
  fair_vendor_paid: "payment_confirmation_sent_at",
};

export async function sendVendorEmail(key: keyof typeof VENDOR_STAMP, vendor: FairVendorEmailData, db: Db = supabaseService()): Promise<SendResult> {
  try {
    const copy = await loadTemplateCopy(key, db);
    const { subject, component } = buildVendorEmail(key, copy, vendor);
    const result = await sendLoggedEmail({ recipientEmail: vendor.email, subject, component, template: key, relatedKind: "christmas_fair_vendor", relatedId: vendor.id });
    if (result.sent) {
      const stamp: Database["public"]["Tables"]["christmas_fair_vendors"]["Update"] = {};
      stamp[VENDOR_STAMP[key]] = new Date().toISOString();
      await db.from("christmas_fair_vendors").update(stamp).eq("id", vendor.id);
    }
    return result;
  } catch (err) {
    return failure(err);
  }
}

export async function sendFairAdminNotice(title: string, lines: string[], related?: { kind: string; id: string }): Promise<SendResult> {
  try {
    return await sendLoggedEmail({
      recipientEmail: FAIR.adminEmail,
      subject: title,
      component: ChristmasFairAdminNotice({ title, lines, href: `${getSiteUrl()}/admin/christmas-fair` }),
      template: "fair_admin_notice",
      relatedKind: related?.kind,
      relatedId: related?.id,
    });
  } catch (err) {
    return failure(err);
  }
}

export const TICKET_EMAIL_COLUMNS = "id, family_name, email, adult_count, child_count, ticket_code, amount_paid_pence, minimum_donation_pence, extra_donation_pence";
export const VENDOR_EMAIL_COLUMNS = "id, contact_name, business_name, email, category, access_token, table_price_pence, payment_due_at, amount_paid_pence";

// ---------------------------------------------------------------------------
// Admin preview: render a template with sample data.
// ---------------------------------------------------------------------------

const SAMPLE_TICKET: FairTicketEmailData = {
  id: "00000000-0000-0000-0000-000000000000",
  family_name: "Amara Okafor",
  email: "amara@example.com",
  adult_count: 2,
  child_count: 3,
  ticket_code: "7f3c2a10-5b1e-4d8a-9c2f-123456789abc",
  amount_paid_pence: 1200,
  minimum_donation_pence: 700,
  extra_donation_pence: 500,
};

const SAMPLE_VENDOR: FairVendorEmailData = {
  id: "00000000-0000-0000-0000-000000000000",
  contact_name: "Jordan Hayes",
  business_name: "Little Makers Club",
  email: "jordan@example.com",
  category: "kids",
  access_token: "11111111-2222-3333-4444-555555555555",
  table_price_pence: FAIR.earlyBirdPricePence,
  payment_due_at: new Date(Date.UTC(2026, 10, 22, 18, 5)).toISOString(),
  amount_paid_pence: FAIR.earlyBirdPricePence,
};

export async function renderTemplatePreview(key: EditableEmailKey, copy: EditableTemplateCopy): Promise<{ subject: string; html: string }> {
  let built: Built;
  if (key === "fair_ticket_confirmation" || key === "fair_ticket_reminder") {
    const qr = await QRCode.toDataURL(fairTicketUrl(SAMPLE_TICKET.ticket_code), { width: 440, margin: 1 });
    built = buildTicketEmail(key, copy, SAMPLE_TICKET, qr);
  } else {
    built = buildVendorEmail(key, copy, SAMPLE_VENDOR);
  }
  return { subject: built.subject, html: await render(built.component) };
}

/** Send the preview (sample data) to an admin so they can see it in a real inbox. */
export async function sendTemplateTest(key: EditableEmailKey, copy: EditableTemplateCopy, to: string): Promise<SendResult> {
  try {
    let built: Built;
    let attachments;
    if (key === "fair_ticket_confirmation" || key === "fair_ticket_reminder") {
      built = buildTicketEmail(key, copy, SAMPLE_TICKET);
      const qr = await QRCode.toBuffer(fairTicketUrl(SAMPLE_TICKET.ticket_code), { type: "png", width: 440, margin: 1 });
      attachments = [{ filename: "sample-ticket.png", content: qr, contentType: "image/png", contentId: QR_CID }];
    } else {
      built = buildVendorEmail(key, copy, SAMPLE_VENDOR);
    }
    return await sendLoggedEmail({ recipientEmail: to, subject: `[TEST] ${built.subject}`, component: built.component, attachments, template: "other", relatedKind: "template_test" });
  } catch (err) {
    return failure(err);
  }
}
