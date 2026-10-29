"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

export type SendMagicLinkResult =
  | { ok: true }
  | { ok: false; error: string };

const emailSchema = z.email().max(254);

/**
 * Where the magic link should land. The request's own origin wins, so local
 * dev, Vercel previews and production each send people back to themselves;
 * NEXT_PUBLIC_SITE_URL is the fallback. Supabase only honours addresses on its
 * redirect allowlist, so a forged Origin header can't redirect anywhere else.
 */
async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // fall through to the configured site URL
    }
  }
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

/**
 * Emails a sign-in link. Runs on the server so the PKCE verifier cookie is set
 * on this response; proxy.ts exchanges the code when the link is opened in the
 * same browser.
 *
 * `shouldCreateUser: false`: this can never create accounts, only sign in ones
 * that already exist in Supabase Auth. For an unknown address Supabase answers
 * `otp_disabled`; that is reported as success so the form can't be used to find
 * out who has an account.
 *
 * Deliberately NOT behind requireAdmin(): the caller is signed out by
 * definition. Being on the admin list is checked by requireAdmin() after they
 * sign in.
 */
export async function sendMagicLink(email: string): Promise<SendMagicLinkResult> {
  const parsed = emailSchema.safeParse(typeof email === "string" ? email.trim() : "");
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  try {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: `${await siteOrigin()}/admin`,
        shouldCreateUser: false,
      },
    });

    if (error && error.code !== "otp_disabled") {
      if (
        error.code === "over_email_send_rate_limit" ||
        error.code === "over_request_rate_limit"
      ) {
        return {
          ok: false,
          error: "Too many sign-in emails requested. Wait a few minutes and try again.",
        };
      }
      return {
        ok: false,
        error: "We couldn't send the link. Check the address and try again.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Sign-in isn't available right now. Please try again shortly.",
    };
  }
}

/**
 * Ends the session and sends the visitor back to the sign-in page.
 *
 * Deliberately NOT behind requireAdmin(): anyone holding a session, admin or
 * not, must always be able to sign out.
 */
export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
