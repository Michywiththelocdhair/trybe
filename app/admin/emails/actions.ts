"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { supabaseService } from "@/lib/supabase/service";
import { EDITABLE_TEMPLATES, isEditableKey } from "@/lib/email/editable-templates";
import { loadTemplateCopy, sendTemplateTest } from "@/lib/christmas-fair/emails";

const templateSchema = z.object({
  subject: z.string().trim().min(1, "Add a subject line.").max(200),
  heading: z.string().trim().min(1, "Add a heading.").max(200),
  body: z.string().trim().min(1, "Add the email text.").max(8000),
  buttonLabel: z.string().trim().max(60).optional(),
});

function keyFrom(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (!isEditableKey(key)) redirect("/admin/emails");
  return key;
}

export async function saveEmailTemplate(formData: FormData) {
  const { admin } = await requireAdmin();
  const key = keyFrom(formData);
  const page = `/admin/emails/templates/${key}`;
  if (!canWrite(admin.role)) redirect(`${page}?error=readonly`);
  const parsed = templateSchema.safeParse({
    subject: formData.get("subject"),
    heading: formData.get("heading"),
    body: String(formData.get("body") ?? "").replace(/\r\n/g, "\n"),
    buttonLabel: formData.get("buttonLabel") ?? undefined,
  });
  if (!parsed.success) redirect(`${page}?error=invalid`);
  const hasButton = EDITABLE_TEMPLATES[key].hasButton;
  const { error } = await supabaseService().from("email_templates").upsert({
    key,
    subject: parsed.data.subject,
    heading: parsed.data.heading,
    body: parsed.data.body,
    button_label: hasButton ? (parsed.data.buttonLabel || EDITABLE_TEMPLATES[key].buttonLabel) : null,
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  });
  if (error) {
    console.error("[admin:emails] template save failed", error);
    redirect(`${page}?error=save`);
  }
  revalidatePath(page);
  revalidatePath("/admin/emails");
  redirect(`${page}?notice=saved`);
}

export async function resetEmailTemplate(formData: FormData) {
  const { admin } = await requireAdmin();
  const key = keyFrom(formData);
  const page = `/admin/emails/templates/${key}`;
  if (!canWrite(admin.role)) redirect(`${page}?error=readonly`);
  const { error } = await supabaseService().from("email_templates").delete().eq("key", key);
  if (error) {
    console.error("[admin:emails] template reset failed", error);
    redirect(`${page}?error=save`);
  }
  revalidatePath(page);
  revalidatePath("/admin/emails");
  redirect(`${page}?notice=reset`);
}

export async function sendTestEmail(formData: FormData) {
  const { admin } = await requireAdmin();
  const key = keyFrom(formData);
  const page = `/admin/emails/templates/${key}`;
  const copy = await loadTemplateCopy(key);
  const result = await sendTemplateTest(key, copy, admin.email);
  redirect(`${page}?notice=${result.sent ? "test-sent" : "test-failed"}`);
}
