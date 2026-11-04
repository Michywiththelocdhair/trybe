"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { supabaseService } from "@/lib/supabase/service";

const capacitySchema = z.object({
  maxFamilies: z.coerce.number().int().min(0).max(10000),
  maxVendors: z.coerce.number().int().min(0).max(10000),
});

export async function updateChristmasFairCapacities(formData: FormData) {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return;
  const values = capacitySchema.safeParse({
    maxFamilies: formData.get("maxFamilies"),
    maxVendors: formData.get("maxVendors"),
  });
  if (!values.success) redirect("/admin/christmas-fair?error=capacity");
  const db = supabaseService();
  const { error } = await db.rpc("update_christmas_fair_capacities", {
    p_max_families: values.data.maxFamilies,
    p_max_vendors: values.data.maxVendors,
  });
  if (error) {
    console.error("[admin:christmas-fair] capacity update failed", error);
    redirect("/admin/christmas-fair?error=capacity");
  }
  revalidatePath("/admin/christmas-fair");
  revalidatePath("/christmas-fair");
  revalidatePath("/christmas-fair/book");
  redirect("/admin/christmas-fair?updated=1");
}

export async function setVendorApplicationStatus(formData: FormData) {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return;
  const parsed = z.object({
    vendorId: z.uuid(),
    status: z.enum(["accepted", "declined"]),
  }).safeParse({ vendorId: formData.get("vendorId"), status: formData.get("status") });
  if (!parsed.success) redirect("/admin/christmas-fair?error=vendors-full");
  const { error } = await supabaseService().rpc("set_christmas_fair_vendor_status", {
    p_vendor_id: parsed.data.vendorId,
    p_status: parsed.data.status,
  });
  if (error) {
    console.error("[admin:christmas-fair] vendor decision failed", error);
    redirect(error.code === "P0003" ? "/admin/christmas-fair?error=vendors-full" : "/admin/christmas-fair?error=capacity");
  }
  revalidatePath("/admin/christmas-fair");
  revalidatePath("/christmas-fair");
  redirect("/admin/christmas-fair?updated=1");
}

export async function cancelFamilyTicket(formData: FormData) {
  const { admin } = await requireAdmin();
  if (!canWrite(admin.role)) return;
  const parsed = z.uuid().safeParse(formData.get("ticketId"));
  if (!parsed.success) redirect("/admin/christmas-fair?error=capacity");
  const { error } = await supabaseService().from("christmas_fair_tickets")
    .update({ status: "cancelled" }).eq("id", parsed.data).eq("status", "confirmed");
  if (error) console.error("[admin:christmas-fair] ticket cancellation failed", error);
  if (error) redirect("/admin/christmas-fair?error=capacity");
  revalidatePath("/admin/christmas-fair");
  revalidatePath("/christmas-fair");
  redirect("/admin/christmas-fair?updated=1");
}
