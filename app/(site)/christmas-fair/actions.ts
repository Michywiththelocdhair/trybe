"use server";

import type Stripe from "stripe";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase/service";
import {
  ALLOWED_UPLOAD_TYPES,
  FAIR,
  formatPence,
  vendorApplicationsOpen,
  vendorCategoryLabel,
} from "@/lib/christmas-fair/config";
import { sendFairAdminNotice, sendVendorEmail, VENDOR_EMAIL_COLUMNS } from "@/lib/christmas-fair/emails";

/**
 * Christmas Fair server actions.
 *
 *  Families: validate -> create_christmas_fair_ticket_hold (capacity-checked,
 *  pending_payment) -> Stripe Checkout -> the webhook confirms the ticket and
 *  emails the QR code. Nothing is confirmed from here.
 *
 *  Vendors: startVendorApplication saves the application, then the browser
 *  uploads the logo and photos straight to Supabase Storage with signed upload
 *  URLs (createVendorUploadUrls) and calls finishVendorUploads, which records
 *  the files and sends the "application received" emails. Payment happens
 *  later, from the vendor's own page, once an admin has approved them.
 */

const STRIPE_MIN_SESSION_MINUTES = 31;

function siteUrl() {
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function issueText(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

const familySchema = z.object({
  familyName: z.string().trim().min(2, "Please enter the lead adult’s full name.").max(100),
  email: z.email("Please enter a valid email address.").max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  adults: z.coerce.number().int().min(1).max(FAIR.maxPeoplePerTicket),
  children: z.coerce.number().int().min(0).max(FAIR.maxPeoplePerTicket - 1),
  extraDonation: z.coerce.number().min(0, "Extra donations can’t be negative.").max(FAIR.maxExtraDonationPence / 100, `Extra donations online are capped at ${formatPence(FAIR.maxExtraDonationPence)}.`).default(0),
  agreed: z.literal("yes", "Please agree to the terms to continue."),
}).refine((data) => data.adults + data.children <= FAIR.maxPeoplePerTicket, {
  path: ["children"], message: `Your family ticket can include up to ${FAIR.maxPeoplePerTicket} people.`,
});

const FAMILY_RPC_ERRORS: Record<string, string> = {
  P0001: `Your family ticket can include up to ${FAIR.maxPeoplePerTicket} people.`,
  P0002: "Family tickets are not available right now.",
  P0003: "Ticket sales for this event have closed.",
  P0004: "All family tickets have now gone. We’re sorry we missed you.",
  P0005: "A family ticket has already been booked with this email. Please check your inbox, or email us if you need help.",
  P0006: "Please check your extra donation amount.",
};

export type FamilyCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

export async function startFamilyTicketCheckout(formData: FormData): Promise<FamilyCheckoutResult> {
  const parsed = familySchema.safeParse(values(formData));
  if (!parsed.success) return { ok: false, error: issueText(parsed.error) };
  const data = parsed.data;
  const extraPence = Math.round(data.extraDonation * 100);
  const db = supabaseService();

  const { data: ticket, error } = await db.rpc("create_christmas_fair_ticket_hold", {
    p_family_name: data.familyName,
    p_email: data.email,
    p_phone: data.phone || null,
    p_adult_count: data.adults,
    p_child_count: data.children,
    p_extra_donation_pence: extraPence,
    p_terms_version: FAIR.termsVersion,
    p_hold_minutes: STRIPE_MIN_SESSION_MINUTES,
  });
  if (error || !ticket) {
    const message = error?.code ? FAMILY_RPC_ERRORS[error.code] : undefined;
    if (!message) console.error("[christmas-fair] ticket hold failed", error);
    return { ok: false, error: message ?? "We couldn’t reserve your ticket. Please try again." };
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: ticket.adult_count,
      price_data: {
        currency: "gbp",
        unit_amount: FAIR.adultMinimumPence,
        product_data: { name: "Entry donation: adult", description: "Trybe Christmas Fair, Sat 19 Dec. Every penny goes to Acres’ Christmas Day dinner." },
      },
    },
  ];
  if (ticket.child_count > 0) {
    lineItems.push({
      quantity: ticket.child_count,
      price_data: {
        currency: "gbp",
        unit_amount: FAIR.childMinimumPence,
        product_data: { name: "Entry donation: child", description: "Trybe Christmas Fair, Sat 19 Dec. Every penny goes to Acres’ Christmas Day dinner." },
      },
    });
  }
  if (ticket.extra_donation_pence > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: ticket.extra_donation_pence,
        product_data: { name: "Extra donation to Acres", description: "Thank you! This goes to Acres’ Christmas Day dinner for people having a tough year." },
      },
    });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        currency: "gbp",
        customer_email: ticket.email,
        line_items: lineItems,
        success_url: `${siteUrl()}/christmas-fair/book/confirmation?ticket=${ticket.ticket_code}`,
        cancel_url: `${siteUrl()}/christmas-fair/book?cancelled=1`,
        metadata: { kind: "christmas_fair_ticket", ticket_id: ticket.id, event_slug: FAIR.slug },
        payment_intent_data: { description: `Trybe Christmas Fair entry donation (${ticket.adult_count} adults, ${ticket.child_count} children)` },
        expires_at: Math.floor(Date.now() / 1000) + STRIPE_MIN_SESSION_MINUTES * 60,
      },
      { idempotencyKey: `fair-ticket-${ticket.id}` },
    );
  } catch (err) {
    console.error("[christmas-fair] Stripe session creation failed", { ticketId: ticket.id, message: err instanceof Error ? err.message : String(err) });
    await db.from("christmas_fair_tickets").update({ status: "expired" }).eq("id", ticket.id).eq("status", "pending_payment");
    return { ok: false, error: "We couldn’t start the payment just now. Please try again in a moment." };
  }
  if (!session.url) {
    await db.from("christmas_fair_tickets").update({ status: "expired" }).eq("id", ticket.id).eq("status", "pending_payment");
    return { ok: false, error: "We couldn’t start the payment just now. Please try again in a moment." };
  }

  const { error: linkError } = await db.from("christmas_fair_tickets").update({
    stripe_checkout_session_id: session.id,
    expires_at: new Date(session.expires_at * 1000).toISOString(),
  }).eq("id", ticket.id);
  if (linkError) console.error("[christmas-fair] failed to save checkout session id", { ticketId: ticket.id, message: linkError.message });

  return { ok: true, url: session.url };
}

// ---------------------------------------------------------------------------
// Vendors: application and uploads
// ---------------------------------------------------------------------------

const vendorSchema = z.object({
  businessName: z.string().trim().min(2, "Please enter your business or stall name.").max(120),
  contactName: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address.").max(254),
  phone: z.string().trim().min(7, "Please enter a mobile number.").max(30),
  category: z.enum(["kids", "food", "crafts", "other"]),
  description: z.string().trim().min(20, "Please tell us a little more about your stall (at least 20 characters).").max(2000),
  website: z.union([z.literal(""), z.url("Please enter a full link, starting https://").max(500)]).optional(),
  needsPower: z.enum(["yes", "no"], "Please tell us whether you need power."),
  insurance: z.literal("yes", "Vendors need basic one-day event public liability insurance."),
  noDrinksOnly: z.literal("yes", "Please confirm your stall isn’t a drinks-only stall."),
  agreed: z.literal("yes", "Please agree to the terms to continue."),
});

export type VendorApplicationResult = { ok: true; token: string } | { ok: false; error: string };

export async function startVendorApplication(formData: FormData): Promise<VendorApplicationResult> {
  if (!vendorApplicationsOpen()) return { ok: false, error: `Vendor applications closed on ${FAIR.vendorDeadlineLabel}.` };
  const parsed = vendorSchema.safeParse(values(formData));
  if (!parsed.success) return { ok: false, error: issueText(parsed.error) };
  const data = parsed.data;
  const db = supabaseService();
  const event = await db.from("events").select("id, status").eq("slug", FAIR.slug).maybeSingle();
  if (event.error || !event.data || event.data.status !== "published") {
    return { ok: false, error: "Vendor applications are not open right now." };
  }
  const { data: vendor, error } = await db.from("christmas_fair_vendors").insert({
    event_id: event.data.id,
    business_name: data.businessName,
    contact_name: data.contactName,
    email: data.email.toLowerCase(),
    phone: data.phone,
    category: data.category,
    description: data.description,
    website: data.website || null,
    needs_power: data.needsPower === "yes",
    has_public_liability_insurance: true,
    terms_version: FAIR.termsVersion,
  }).select("access_token").single();
  if (error || !vendor) {
    console.error("[christmas-fair] vendor application failed", error);
    return { ok: false, error: "We couldn’t send your application. Please try again." };
  }
  return { ok: true, token: vendor.access_token };
}

const uploadRequestSchema = z.object({
  token: z.uuid(),
  files: z.array(z.object({
    kind: z.enum(["logo", "photo"]),
    type: z.enum(ALLOWED_UPLOAD_TYPES),
    size: z.number().int().positive().max(FAIR.maxUploadBytes),
  })).min(1).max(FAIR.maxVendorPhotos + 1),
});

export type UploadUrlsResult = { ok: true; uploads: { path: string; token: string }[] } | { ok: false; error: string };

const EXTENSIONS: Record<(typeof ALLOWED_UPLOAD_TYPES)[number], string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
};

export async function createVendorUploadUrls(input: { token: string; files: { kind: "logo" | "photo"; type: string; size: number }[] }): Promise<UploadUrlsResult> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Images must be JPG, PNG, WebP or HEIC files under 5MB, with one logo and up to 4 photos." };
  const { token, files } = parsed.data;
  if (files.filter((f) => f.kind === "logo").length > 1) return { ok: false, error: "Please upload one logo." };
  if (files.filter((f) => f.kind === "photo").length > FAIR.maxVendorPhotos) return { ok: false, error: `Please upload up to ${FAIR.maxVendorPhotos} photos.` };
  const db = supabaseService();
  const { data: vendor } = await db.from("christmas_fair_vendors").select("id, status").eq("access_token", token).maybeSingle();
  if (!vendor || vendor.status === "declined" || vendor.status === "refunded") return { ok: false, error: "We couldn’t find this application." };

  const stamp = Date.now();
  const bucket = db.storage.from(FAIR.uploadBucket);
  const uploads: { path: string; token: string }[] = [];
  let photo = 0;
  for (const file of files) {
    const name = file.kind === "logo" ? `logo-${stamp}` : `photo-${stamp}-${++photo}`;
    const path = `${vendor.id}/${name}.${EXTENSIONS[file.type]}`;
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[christmas-fair] signed upload url failed", { vendorId: vendor.id, message: error?.message });
      return { ok: false, error: "We couldn’t prepare your uploads. Please try again." };
    }
    uploads.push({ path: data.path, token: data.token });
  }
  return { ok: true, uploads };
}

export type FinishUploadsResult = { ok: true; logo: boolean; photos: number } | { ok: false; error: string };

export async function finishVendorUploads(token: string): Promise<FinishUploadsResult> {
  if (!z.uuid().safeParse(token).success) return { ok: false, error: "We couldn’t find this application." };
  const db = supabaseService();
  const { data: vendor } = await db.from("christmas_fair_vendors")
    .select(`${VENDOR_EMAIL_COLUMNS}, status, applicant_confirmation_sent_at, admin_notified_at, needs_power, phone`)
    .eq("access_token", token).maybeSingle();
  if (!vendor) return { ok: false, error: "We couldn’t find this application." };

  const { data: listed, error: listError } = await db.storage.from(FAIR.uploadBucket).list(vendor.id, { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (listError) {
    console.error("[christmas-fair] could not list vendor uploads", { vendorId: vendor.id, message: listError.message });
    return { ok: false, error: "We couldn’t save your uploads. Please try again." };
  }
  const names = (listed ?? []).map((f) => f.name).filter((n) => n && !n.startsWith("."));
  // Names carry a timestamp, so descending order puts the newest upload first.
  const logo = names.find((n) => n.startsWith("logo-"));
  const latestPhotoBatch = names.filter((n) => n.startsWith("photo-")).slice(0, FAIR.maxVendorPhotos);
  const update: { uploads_completed_at: string; logo_path?: string; photo_paths?: string[] } = { uploads_completed_at: new Date().toISOString() };
  if (logo) update.logo_path = `${vendor.id}/${logo}`;
  if (latestPhotoBatch.length > 0) update.photo_paths = latestPhotoBatch.map((n) => `${vendor.id}/${n}`);
  const { error } = await db.from("christmas_fair_vendors").update(update).eq("id", vendor.id);
  if (error) {
    console.error("[christmas-fair] could not save vendor uploads", { vendorId: vendor.id, message: error.message });
    return { ok: false, error: "We couldn’t save your uploads. Please try again." };
  }

  if (!vendor.applicant_confirmation_sent_at) {
    const sent = await sendVendorEmail("fair_vendor_received", vendor, db);
    if (!sent.sent) console.error("[christmas-fair] vendor receipt email failed", { vendorId: vendor.id, error: sent.error });
  }
  if (!vendor.admin_notified_at) {
    const notified = await sendFairAdminNotice("New Christmas Fair vendor application", [
      `Business: ${vendor.business_name}`,
      `Contact: ${vendor.contact_name} (${vendor.email}, ${vendor.phone})`,
      `Stall: ${vendorCategoryLabel(vendor.category)}`,
      `Power needed: ${vendor.needs_power ? "Yes" : "No"}`,
      "Approve or decline it in the admin dashboard.",
    ], { kind: "christmas_fair_vendor", id: vendor.id });
    if (notified.sent) await db.from("christmas_fair_vendors").update({ admin_notified_at: new Date().toISOString() }).eq("id", vendor.id);
  }
  return { ok: true, logo: Boolean(logo), photos: latestPhotoBatch.length };
}

// ---------------------------------------------------------------------------
// Vendors: table payment (after approval)
// ---------------------------------------------------------------------------

export async function payVendorTable(formData: FormData) {
  const token = z.uuid().safeParse(formData.get("token"));
  if (!token.success) redirect("/christmas-fair");
  const page = `/christmas-fair/vendor/${token.data}`;
  const db = supabaseService();
  const { data: vendor } = await db.from("christmas_fair_vendors")
    .select("id, email, business_name, status, table_price_pence, payment_due_at, approved_at")
    .eq("access_token", token.data).maybeSingle();
  if (!vendor) redirect("/christmas-fair");
  if (vendor.status === "paid") redirect(`${page}?paid=1`);
  if (
    vendor.status !== "approved" || !vendor.table_price_pence || !vendor.payment_due_at ||
    Date.parse(vendor.payment_due_at) <= Date.now()
  ) redirect(`${page}?error=closed`);

  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        currency: "gbp",
        customer_email: vendor.email,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: vendor.table_price_pence,
            product_data: {
              name: vendor.table_price_pence === FAIR.earlyBirdPricePence ? "Vendor table (early bird): Trybe Christmas Fair" : "Vendor table: Trybe Christmas Fair",
              description: `${vendor.business_name} · Sat 19 Dec, Acres. Table and chairs provided.`,
            },
          },
        }],
        success_url: `${siteUrl()}${page}?paid=1`,
        cancel_url: `${siteUrl()}${page}`,
        metadata: { kind: "christmas_fair_vendor", vendor_id: vendor.id, event_slug: FAIR.slug },
        payment_intent_data: { description: `Trybe Christmas Fair vendor table: ${vendor.business_name}` },
        expires_at: Math.floor(Date.now() / 1000) + STRIPE_MIN_SESSION_MINUTES * 60,
      },
    );
    await db.from("christmas_fair_vendors").update({ stripe_checkout_session_id: session.id }).eq("id", vendor.id);
    url = session.url;
  } catch (err) {
    console.error("[christmas-fair] vendor Stripe session failed", { vendorId: vendor.id, message: err instanceof Error ? err.message : String(err) });
  }
  if (!url) redirect(`${page}?error=payment`);
  redirect(url);
}
