"use server";

import { z } from "zod";
import { Resend } from "resend";
import { requireEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { WelcomeEmail, welcomeSubject } from "@/lib/email/templates/welcome";
import type { NewsletterState } from "@/lib/newsletter/types";

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .safeParse(formData.get("email"));
  if (!parsed.success) {
    return { success: false, error: "Please enter a valid email address." };
  }
  const email = parsed.data;

  let isNew = true;
  try {
    const resend = new Resend(requireEnv("RESEND_API_KEY"));
    const { error } = await resend.contacts.create({
      email,
      audienceId: requireEnv("RESEND_AUDIENCE_ID"),
    });
    if (error) {
      if (/already exists|duplicate/i.test(error.message ?? "")) {
        isNew = false;
      } else {
        console.error("[newsletter] contacts.create failed", error);
        return { success: false, error: "Something went wrong. Please try again." };
      }
    }
  } catch (e) {
    console.error("[newsletter] subscribe failed", e);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // Existing subscribers still see success, but don't get a second welcome email.
  if (isNew) {
    const result = await sendEmail({
      recipientEmail: email,
      subject: welcomeSubject(),
      component: WelcomeEmail({ email }),
    });
    if (result.error) console.error("[newsletter] welcome email failed", result.error);
  }

  return { success: true };
}
