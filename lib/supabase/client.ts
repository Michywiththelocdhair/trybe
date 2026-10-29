/**
 * Browser-side Supabase client. For use in Client Components only
 * (admin login form, future reactive admin widgets).
 *
 * Uses the anon key — RLS applies.
 */
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { env, requireEnv } from "@/lib/env";
import type { Database } from "./types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function supabaseBrowser() {
  if (cached) return cached;
  // requireEnv here enforces presence in the public (NEXT_PUBLIC_) scope,
  // which is also what the client bundle inlines.
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}

// Re-export env for consumers that need the publishable Stripe key etc.
export { env };
