"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { supabaseService } from "@/lib/supabase/service";
import { FAIR } from "@/lib/christmas-fair/config";
import { sendVendorEmail } from "@/lib/christmas-fair/emails";

const capacitySchema = z.object({
  maxFamilies: z.coerce.number().int().min(0).max(10000),
  maxVendors: z.coerce.number().int().min(0).max(10000),
});

function refresh() {
  revalidatePath("/admin/christmas-fair");
  revalidatePath("/christmas-fair");
  revalidatePath("/christmas-fair/book");
}

export async function updateChristmasFairCapacities(formData: FormData) {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return;
  const values = capacitySchema.safeParse({
    maxFamilies: formData.get("maxFamilies"),
    maxVendors: formData.get("maxVendors"),
  });
  if (!values.success) redirect("/admin/christmas-fair?error=capacity");
  const { error } = await supabaseService().rpc("update_christmas_fair_capacities", {
    p_max_families: values.data.maxFamilies,
    p_max_vendors: values.data.maxVendors,
  });
  if (error) {
    console.error("[admin:christmas-fair] capacity update failed", error);
    redirect("/admin/christmas-fair?error=capacity");
  }
  refresh();
  redirect("/admin/christmas-fair?notice=saved");
}

const vendorIdSchema = z.uuid();

/** Approve (or re-send an approval): fixes the price, opens a 3-day window and emails the payment link. */
export async function approveVendor(formData: FormData) {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return;
  const id = vendorIdSchema.safeParse(formData.get("vendorId"));
  if (!id.success) redirect("/admin/christmas-fair?error=vendor");
  const db = supabaseService();
  const { data: vendor, error } = await db.rpc("approve_christmas_fair_vendor", { p_vendor_id: id.data, p_payment_days: FAIR.vendorPaymentDays });
  if (error || !vendor) {
    console.error("[admin:christmas-fair] approval failed", error);
    redirect(error?.code === "P0003" ? "/admin/christmas-fair?error=vendors-full#vendors" : "/admin/christmas-fair?error=vendor#vendors");
  }
  const sent = await sendVendorEmail("fair_vendor_approved", vendor, db);
  if (!sent.sent) console.error("[admin:christmas-fair] approval email failed", { vendorId: vendor.id, error: sent.error });
  refresh();
  redirect(`/admin/christmas-fair?notice=${sent.sent ? "approved" : "approved-email-failed"}#vendors`);
}

export async function declineVendor(formData: FormData) {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return;
  const id = vendorIdSchema.safeParse(formData.get("vendorId"));
  if (!id.success) redirect("/admin/christmas-fair?error=vendor");
  const db = supabaseService();
  const { data: vendor, error } = await db.rpc("decline_christmas_fair_vendor", { p_vendor_id: id.data });
  if (error || !vendor) {
    console.error("[admin:christmas-fair] decline failed", error);
    redirect("/admin/christmas-fair?error=vendor#vendors");
  }
  const sent = await sendVendorEmail("fair_vendor_declined", vendor, db);
  if (!sent.sent) console.error("[admin:christmas-fair] decline email failed", { vendorId: vendor.id, error: sent.error });
  refresh();
  redirect(`/admin/christmas-fair?notice=${sent.sent ? "declined" : "declined-email-failed"}#vendors`);
}

export async function cancelFamilyTicket(formData: FormData) {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return;
  const parsed = z.uuid().safeParse(formData.get("ticketId"));
  if (!parsed.success) redirect("/admin/christmas-fair?error=capacity");
  const { error } = await supabaseService().from("christmas_fair_tickets")
    .update({ status: "cancelled" }).eq("id", parsed.data).eq("status", "confirmed");
  if (error) {
    console.error("[admin:christmas-fair] ticket cancellation failed", error);
    redirect("/admin/christmas-fair?error=capacity");
  }
  refresh();
  redirect("/admin/christmas-fair?notice=saved");
}
