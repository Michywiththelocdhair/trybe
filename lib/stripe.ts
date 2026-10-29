/**
 * Stripe client singleton. Server-only.
 *
 * Lazy-initializes with the secret key so public pages can build without
 * Stripe configured. Any server code that reaches `stripe()` without the
 * env var set gets a clear error naming the missing variable.
 */
import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    // Pin API version so Stripe schema changes don't silently alter behavior.
    // Bump intentionally when upgrading, retest the webhook payload shape.
    apiVersion: "2026-09-30.endive",
    typescript: true,
    appInfo: {
      name: "Trybe Website",
      url: "https://trybe.uk",
    },
  });
  return cached;
}
