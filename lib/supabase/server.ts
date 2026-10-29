/**
 * Session-aware Supabase client for Server Components and Server Actions.
 * Reads auth cookies from the request so Supabase.auth.getUser() returns
 * the currently-signed-in user.
 *
 * Use for:
 *  - Admin dashboard pages that need to check who's viewing
 *  - Server Actions behind auth
 *
 * Public RLS still applies. If you need to bypass RLS (e.g. writing a
 * booking as a visitor), use `lib/supabase/service.ts` instead.
 */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";
import type { Database } from "./types";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without a response. The middleware
            // keeps the session fresh in that case, so this swallow is safe.
          }
        },
      },
    },
  );
}
