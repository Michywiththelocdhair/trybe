"use server";

import { z } from "zod";
import { env } from "@/lib/env";
import type { NewsletterState } from "@/lib/newsletter/types";

const EMAIL_SUBSCRIPTION_ENDPOINT =
  "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs";
const KLAVIYO_REVISION = "2026-10-15";

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (formData.get("marketingConsent") !== "yes") {
    return { success: false, error: "Please confirm that you want to receive Trybe email updates." };
  }

  if (!env.KLAVIYO_PRIVATE_API_KEY || !env.KLAVIYO_NEWSLETTER_LIST_ID) {
    console.error("[newsletter] Klaviyo is not configured");
    return { success: false, error: "Signup is temporarily unavailable. Please try again later." };
  }

  try {
    const response = await fetch(EMAIL_SUBSCRIPTION_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Klaviyo-API-Key ${env.KLAVIYO_PRIVATE_API_KEY}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        revision: KLAVIYO_REVISION,
      },
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: {
              data: [{
                type: "profile",
                attributes: {
                  email: parsed.data,
                  subscriptions: {
                    email: { marketing: { consent: "SUBSCRIBED" } },
                  },
                },
              }],
            },
          },
          relationships: {
            list: {
              data: { type: "list", id: env.KLAVIYO_NEWSLETTER_LIST_ID },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("[newsletter] Klaviyo subscription request failed", {
        status: response.status,
      });
      return { success: false, error: "Something went wrong. Please try again." };
    }
  } catch (error) {
    console.error(
      "[newsletter] Klaviyo request failed",
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
