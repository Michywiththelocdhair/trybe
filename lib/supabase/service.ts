/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * Use ONLY in Server Actions, Route Handlers, and server-side utilities that
 * need to read or write data the user isn't allowed to touch directly (e.g.
 * calling the create_booking_with_children RPC, writing to email_log, upserting
 * on a Stripe webhook).
 *
 * NEVER import this from a Client Component or any file that gets bundled
 * to the browser. The SUPABASE_SERVICE_ROLE_KEY is a god-mode credential.
 *
 * The client is lazy-initialized the first time it's requested so a dev
 * environment missing the key can still `next build` the public pages.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import type { Database } from "./types";

let cached: SupabaseClient<Database> | null = null;

export function supabaseService(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  cached = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        "X-Client-Info": "trybe-website/server",
      },
    },
  });
  return cached;
}
