"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Ends the session and sends the visitor back to the sign-in page.
 *
 * Deliberately NOT behind requireAdmin(): anyone holding a session, admin or
 * not, must always be able to sign out. (The magic-link send happens
 * client-side via supabaseBrowser; see components/admin/login-form.tsx.)
 */
export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
