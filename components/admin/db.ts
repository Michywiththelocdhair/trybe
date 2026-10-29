/**
 * Typed Supabase clients for the admin dashboard.
 *
 * Why this exists: `lib/supabase/types.ts` is hand-rolled and its tables have
 * no `Relationships` key, which supabase-js requires. Without it every
 * `.from("table")` call resolves to `never`. This adapter adds the missing key
 * at the type level only (nothing changes at runtime), so queries are fully
 * typed against the real Row / Update shapes.
 *
 * Delete this file's adapter once `types.ts` is regenerated with
 * `supabase gen types` (generated types include Relationships).
 *
 * Reads use the session client (RLS applies, the admin policy lets admins
 * through). Writes use the service-role client; the admin check happens at the
 * application layer in `requireAdmin()`.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

type PublicSchema = Database["public"];

export type AdminDatabase = {
  public: Omit<PublicSchema, "Tables"> & {
    Tables: {
      [K in keyof PublicSchema["Tables"]]: PublicSchema["Tables"][K] & {
        Relationships: [];
      };
    };
  };
};

export type AdminClient = SupabaseClient<AdminDatabase>;

export type BookingRow = PublicSchema["Tables"]["bookings"]["Row"];
export type EventRow = PublicSchema["Tables"]["events"]["Row"];
export type ChildRow = PublicSchema["Tables"]["children"]["Row"];

/** Session-aware client. Use for reads. */
export async function adminReadClient(): Promise<AdminClient> {
  return (await supabaseServer()) as unknown as AdminClient;
}

/** Service-role client (bypasses RLS). Use for mutations after requireAdmin(). */
export function adminWriteClient(): AdminClient {
  return supabaseService() as unknown as AdminClient;
}
