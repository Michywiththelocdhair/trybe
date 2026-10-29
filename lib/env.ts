/**
 * Type-safe environment variable access.
 *
 * Parses process.env at boot through zod. A missing or malformed variable
 * fails loudly at startup rather than crashing mid-request.
 *
 * Scoping:
 * - Server fields (secrets) are typed on `env` unconditionally, but only
 *   READ at runtime on the server. If a Client Component imports this file,
 *   webpack tree-shakes away the server-only values (they're `undefined` in
 *   the client bundle) — anything calling `requireEnv("SOMETHING_SECRET")`
 *   from the browser will throw at call time. Combine with `import
 *   "server-only"` in files that must stay server-side (lib/stripe.ts,
 *   lib/supabase/service.ts).
 * - Client fields (NEXT_PUBLIC_*) are always inlined by Next.js into the
 *   client bundle.
 *
 * All secrets are optional at parse time so `next build` succeeds locally
 * without a .env.local. The server helpers that need a secret call
 * `requireEnv("KEY")` which throws a clear message when it's missing.
 */
import { z } from "zod";

const envSchema = z.object({
  // Public — bundled into the client.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  // Server-only — never bundled, undefined in the browser.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).default("Trybe <hello@trybe.uk>"),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  TERMS_VERSION: z.string().min(1).default("v1-2026-10"),
  CRON_SECRET: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten());
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

/**
 * Resolve a value that was optional at parse time but is mandatory for a
 * particular feature. Throws a clear message naming the missing key.
 */
export function requireEnv<K extends keyof typeof env>(
  key: K,
): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Missing required environment variable: ${String(key)}. ` +
        "Add it to .env.local for local development or to the Vercel " +
        "project's environment variables for production.",
    );
  }
  return value as NonNullable<(typeof env)[K]>;
}
