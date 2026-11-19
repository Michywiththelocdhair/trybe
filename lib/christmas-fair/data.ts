import "server-only";
import { supabaseService } from "@/lib/supabase/service";
import { FAIR } from "./config";

export type ChristmasFairData = {
  eventId: string | null;
  familyLimit: number;
  vendorLimit: number;
  familyTicketsRemaining: number;
  vendorPitchesRemaining: number;
  earlyBirdTablesRemaining: number;
};

export async function getChristmasFairData(): Promise<ChristmasFairData> {
  const fallback: ChristmasFairData = {
    eventId: null,
    familyLimit: FAIR.familyCapacity,
    vendorLimit: FAIR.vendorCapacity,
    familyTicketsRemaining: FAIR.familyCapacity,
    vendorPitchesRemaining: FAIR.vendorCapacity,
    earlyBirdTablesRemaining: FAIR.earlyBirdTables,
  };
  try {
    const db = supabaseService();
    const event = await db.from("events").select("id, max_family_tickets, max_vendor_pitches").eq("slug", FAIR.slug).maybeSingle();
    if (!event.data || event.error) return fallback;
    const now = new Date().toISOString();
    const [confirmed, held, vendors] = await Promise.all([
      db.from("christmas_fair_tickets").select("id", { count: "exact", head: true }).eq("event_id", event.data.id).eq("status", "confirmed"),
      db.from("christmas_fair_tickets").select("id", { count: "exact", head: true }).eq("event_id", event.data.id).eq("status", "pending_payment").gt("expires_at", now),
      db.from("christmas_fair_vendors").select("status, payment_due_at, table_price_pence").eq("event_id", event.data.id).in("status", ["paid", "approved"]),
    ]);
    const holding = (vendors.data ?? []).filter((v) => v.status === "paid" || (v.payment_due_at !== null && Date.parse(v.payment_due_at) > Date.now()));
    const familyLimit = event.data.max_family_tickets ?? FAIR.familyCapacity;
    const vendorLimit = event.data.max_vendor_pitches ?? FAIR.vendorCapacity;
    return {
      eventId: event.data.id,
      familyLimit,
      vendorLimit,
      familyTicketsRemaining: Math.max(0, familyLimit - (confirmed.count ?? 0) - (held.count ?? 0)),
      vendorPitchesRemaining: Math.max(0, vendorLimit - holding.length),
      earlyBirdTablesRemaining: Math.max(0, FAIR.earlyBirdTables - holding.filter((v) => v.table_price_pence === FAIR.earlyBirdPricePence).length),
    };
  } catch {
    return fallback;
  }
}
