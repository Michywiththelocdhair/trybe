/**
 * Type-safe environment variable access.
 *
 * ── Why this file is picky about `process.env` ──
 * Next.js inlines public env vars (NEXT_PUBLIC_*) into the client bundle at
 * build time — but only when it sees LITERAL property accesses in the source:
 *   process.env.NEXT_PUBLIC_FOO    // inlined (string literal)
 *   process.env["NEXT_PUBLIC_FOO"] // inlined
 *   process.env                    // NOT inlined — becomes `{}` in the browser
 *
 * Passing `process.env` straight to a zod `safeParse()` means the client build
 * sees `{}` and every NEXT_PUBLIC_* value comes back undefined — Worker C hit
 * exactly this during Phase 3.
 *
 * The fix is to destructure each variable explicitly below. On the server all
 * of them resolve. In the browser, only the NEXT_PUBLIC_ ones are inlined;
 * the server-only ones become `undefined`, and since the schema marks them
 * optional, parse still succeeds. `requireEnv("SOMETHING_SECRET")` from the
 * browser throws a clear error, which is what we want.
 *
 * Files that MUST stay server-side (lib/stripe.ts, lib/supabase/service.ts)
 * additionally import "server-only" so webpack errors at build time if a
 * Client Component tries to pull them in.
 */
import { z } from "zod";

const envSchema = z.object({
  // Public — bundled into the client via explicit property access below.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  // Server-only — undefined in the browser bundle.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).default("Trybe <hello@trybe.uk>"),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  TERMS_VERSION: z.string().min(1).default("v1-2026-10"),
  CRON_SECRET: z.string().min(1).optional(),
});

// Explicit property access so Next.js inlines each NEXT_PUBLIC_* in the client
// bundle. Do NOT replace this with `process.env` — see the file header.
const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  BOOKING_HOLD_MINUTES: process.env.BOOKING_HOLD_MINUTES,
  TERMS_VERSION: process.env.TERMS_VERSION,
  CRON_SECRET: process.env.CRON_SECRET,
};

const parsed = envSchema.safeParse(raw);

if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  console.error("❌ Invalid environment variables:", JSON.stringify(issues, null, 2));
  throw new Error(
    `Invalid environment variables:\n${Object.entries(issues)
      .map(([key, msgs]) => `  ${key}: ${(msgs as string[]).join(", ")}`)
      .join("\n")}`,
  );
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
