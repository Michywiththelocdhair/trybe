"use server";

import QRCode from "qrcode";
import { z } from "zod";
import { env } from "@/lib/env";
import { supabaseService } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/send";
import {
  ChristmasFairAdminNotice,
  ChristmasFairTicketEmail,
  christmasFairAdminSubject,
  christmasFairTicketSubject,
  christmasFairTicketUrl,
  ChristmasFairVendorReceivedEmail,
  christmasFairVendorReceivedSubject,
} from "@/lib/email/templates/christmas-fair";

const SLUG = "christmas-fair-2026";
const ADMIN_EMAIL = "trybeappuk@gmail.com";
const TERMS_VERSION = "christmas-fair-v1-2026-11";
const familySchema = z.object({
  familyName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  adults: z.coerce.number().int().min(1).max(8),
  children: z.coerce.number().int().min(0).max(7),
  agreed: z.literal("yes"),
}).refine((data) => data.adults + data.children <= 8, {
  path: ["children"], message: "Your family ticket can include up to 8 people.",
});

const vendorSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(30),
  category: z.enum(["kids", "food", "crafts", "other"]),
  description: z.string().trim().min(20).max(2000),
  website: z.union([z.literal(""), z.url().max(500)]).optional(),
  needsPower: z.enum(["yes", "no"]),
  insurance: z.enum(["yes", "no"]),
  foodHygieneRating: z.string().trim().max(80).optional(),
  agreed: z.literal("yes"),
}).refine((data) => data.category !== "food" || Boolean(data.foodHygieneRating?.trim()), {
  path: ["foodHygieneRating"], message: "Please enter your food hygiene rating.",
});

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function issueText(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

async function notifyAdmin(title: string, lines: string[]) {
  const result = await sendEmail({
    recipientEmail: ADMIN_EMAIL,
    subject: christmasFairAdminSubject(title),
    component: ChristmasFairAdminNotice({
      title,
      lines,
      href: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/admin/christmas-fair`,
    }),
  });
  return result.sent;
}

export type FamilyTicketResult =
  | { ok: true; emailSent: boolean; ticketCode: string }
  | { ok: false; error: string };

export async function createFamilyTicket(formData: FormData): Promise<FamilyTicketResult> {
  const parsed = familySchema.safeParse(values(formData));
  if (!parsed.success) return { ok: false, error: issueText(parsed.error) };
  const data = parsed.data;
  const db = supabaseService();
  const event = await db.from("events").select("id, status").eq("slug", SLUG).maybeSingle();
  if (event.error || !event.data || event.data.status !== "published") {
    return { ok: false, error: "Family tickets are not available right now." };
  }

  const { data: ticket, error } = await db.rpc("create_christmas_fair_ticket", {
    p_family_name: data.familyName,
    p_email: data.email,
    p_phone: data.phone || null,
    p_adult_count: data.adults,
    p_child_count: data.children,
    p_terms_version: TERMS_VERSION,
  });
  if (error || !ticket) {
    if (error?.code === "P0004") return { ok: false, error: "All family tickets have been claimed. We’re sorry we missed you." };
    if (error?.code === "P0005") return { ok: false, error: "A family ticket has already been registered with this email. Please check your inbox or contact Trybe if you need help." };
    if (error?.code === "P0003") return { ok: false, error: "Ticket registration for this event has closed." };
    if (error?.code === "P0001") return { ok: false, error: "Your family ticket can include up to 8 people." };
    console.error("[christmas-fair] ticket creation failed", error);
    return { ok: false, error: "We couldn’t reserve your ticket. Please try again." };
  }

  const ticketUrl = christmasFairTicketUrl(ticket.ticket_code);
  let emailSent = false;
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
        eventDate: "2026-12-19",
        ticketUrl,
      }),
      attachments: [{ filename: "trybe-christmas-fair-ticket.png", content: qr, contentType: "image/png", contentId: "christmas-fair-ticket-qr" }],
    });
    emailSent = result.sent;
    if (!result.sent) console.error("[christmas-fair] ticket email failed", result.error);
  } catch (err) {
    console.error("[christmas-fair] ticket email failed", err);
  }
  if (emailSent) {
    await db.from("christmas_fair_tickets").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", ticket.id);
  }

  const adminNotified = await notifyAdmin("New Christmas Fair family ticket", [
    `Family: ${ticket.family_name}`,
    `Email: ${ticket.email}`,
    `Party: ${ticket.adult_count} adults, ${ticket.child_count} children`,
  ]).catch((err) => {
    console.error("[christmas-fair] admin ticket notice failed", err);
    return false;
  });
  if (adminNotified) {
    await db.from("christmas_fair_tickets").update({ admin_notified_at: new Date().toISOString() }).eq("id", ticket.id);
  }
  return { ok: true, emailSent, ticketCode: ticket.ticket_code };
}

export type VendorApplicationResult = { ok: true } | { ok: false; error: string };

export async function createVendorApplication(formData: FormData): Promise<VendorApplicationResult> {
  const parsed = vendorSchema.safeParse(values(formData));
  if (!parsed.success) return { ok: false, error: issueText(parsed.error) };
  if (Date.now() >= Date.parse("2026-12-11T00:00:00Z")) {
    return { ok: false, error: "Vendor applications closed on 10 December 2026." };
  }
  const data = parsed.data;
  const db = supabaseService();
  const event = await db.from("events").select("id, status").eq("slug", SLUG).maybeSingle();
  if (event.error || !event.data || event.data.status !== "published") {
    return { ok: false, error: "Vendor applications are not open right now." };
  }
  const { data: vendor, error } = await db.from("christmas_fair_vendors").insert({
    event_id: event.data.id,
    business_name: data.businessName,
    contact_name: data.contactName,
    email: data.email,
    phone: data.phone,
    category: data.category,
    description: data.description,
    website: data.website || null,
    needs_power: data.needsPower === "yes",
    has_public_liability_insurance: data.insurance === "yes",
    food_hygiene_rating: data.category === "food" ? data.foodHygieneRating?.trim() ?? null : null,
    terms_version: TERMS_VERSION,
  }).select("id, business_name, contact_name, email, category").single();
  if (error || !vendor) {
    console.error("[christmas-fair] vendor application failed", error);
    return { ok: false, error: "We couldn’t send your application. Please try again." };
  }

  const vendorReceipt = await sendEmail({
    recipientEmail: vendor.email,
    subject: christmasFairVendorReceivedSubject(),
    component: ChristmasFairVendorReceivedEmail({ contactName: vendor.contact_name, businessName: vendor.business_name }),
  }).catch((err) => {
    console.error("[christmas-fair] vendor receipt email failed", err);
    return { sent: false };
  });
  if (vendorReceipt.sent) {
    await db.from("christmas_fair_vendors").update({ applicant_confirmation_sent_at: new Date().toISOString() }).eq("id", vendor.id);
  }

  const notified = await notifyAdmin("New Christmas Fair vendor application", [
    `Business: ${vendor.business_name}`,
    `Contact: ${vendor.contact_name} (${vendor.email})`,
    `Category: ${vendor.category}`,
    `Review and respond in the admin dashboard.`,
  ]).catch((err) => {
    console.error("[christmas-fair] admin vendor notice failed", err);
    return false;
  });
  if (notified) {
    await db.from("christmas_fair_vendors").update({ admin_notified_at: new Date().toISOString() }).eq("id", vendor.id);
  }
  return { ok: true };
}
