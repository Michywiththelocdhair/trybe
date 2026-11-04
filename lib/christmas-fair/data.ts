import "server-only";
import { supabaseService } from "@/lib/supabase/service";

const SLUG = "christmas-fair-2026";

export type ChristmasFairData = {
  eventId: string | null;
  familyLimit: number;
  vendorLimit: number;
  familyTicketsRemaining: number;
  vendorPitchesRemaining: number;
};

export async function getChristmasFairData(): Promise<ChristmasFairData> {
  const fallback: ChristmasFairData = {
    eventId: null,
    familyLimit: 50,
    vendorLimit: 20,
    familyTicketsRemaining: 50,
    vendorPitchesRemaining: 20,
  };
  try {
    const db = supabaseService();
    const event = await db.from("events").select("id, max_family_tickets, max_vendor_pitches").eq("slug", SLUG).maybeSingle();
    if (!event.data || event.error) return fallback;
    const [families, vendors] = await Promise.all([
      db.from("christmas_fair_tickets").select("id", { count: "exact", head: true }).eq("event_id", event.data.id).eq("status", "confirmed"),
      db.from("christmas_fair_vendors").select("id", { count: "exact", head: true }).eq("event_id", event.data.id).eq("status", "accepted"),
    ]);
    const familyLimit = event.data.max_family_tickets ?? 50;
    const vendorLimit = event.data.max_vendor_pitches ?? 20;
    return {
      eventId: event.data.id,
      familyLimit,
      vendorLimit,
      familyTicketsRemaining: Math.max(0, familyLimit - (families.count ?? 0)),
      vendorPitchesRemaining: Math.max(0, vendorLimit - (vendors.count ?? 0)),
    };
  } catch {
    return fallback;
  }
}
