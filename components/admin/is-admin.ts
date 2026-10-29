/**
 * Admin gate. Every admin page calls `requireAdmin()` as its first line and
 * every admin Server Action re-checks it: the client is never trusted to say
 * who it is.
 *
 * `getAdmin()` is the non-redirecting variant. The admin layout and the login
 * page use it (they must render for signed-out visitors, so they cannot
 * redirect). It is wrapped in React `cache()` so the layout and the page share
 * one auth round-trip per request.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { AdminRole } from "@/lib/supabase/types";
import { adminReadClient } from "./db";

export type AdminRow = { id: string; role: AdminRole; email: string };
export type AdminSession = { user: User; admin: AdminRow };

type Resolved =
  | { kind: "anonymous" }
  | { kind: "not-admin"; user: User }
  | { kind: "admin"; user: User; admin: AdminRow };

const resolve = cache(async (): Promise<Resolved> => {
  // Auth is per-request and time-dependent (token expiry), so never prerender
  // it. This also keeps Cache Components from flagging the clock reads inside
  // the Supabase client.
  await connection();
  const supabase = await adminReadClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!adminRow) return { kind: "not-admin", user };

  return { kind: "admin", user, admin: adminRow };
});

/** The signed-in admin, or null. Never redirects. */
export async function getAdmin(): Promise<AdminSession | null> {
  const result = await resolve();
  return result.kind === "admin"
    ? { user: result.user, admin: result.admin }
    : null;
}

/** The signed-in admin, or a redirect to /admin/login. */
export async function requireAdmin(): Promise<AdminSession> {
  const result = await resolve();
  if (result.kind === "anonymous") redirect("/admin/login");
  if (result.kind === "not-admin") redirect("/admin/login?error=not-authorized");
  return { user: result.user, admin: result.admin };
}

/** owner and editor can change data; viewer is read-only. */
export function canWrite(role: AdminRole): boolean {
  return role === "owner" || role === "editor";
}
