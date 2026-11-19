import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Vercel Cron (every 5 min, see vercel.json). Marks pending_payment bookings
 * whose hold has lapsed as `expired`, which releases their capacity.
 *
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is set.
 */

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(req: NextRequest) {
  // Read the request FIRST. With Cache Components a GET handler that returns
  // before touching the request can be prerendered at build time and frozen.
  const authorization = req.headers.get("authorization") ?? "";

  const secret = env.CRON_SECRET;
  if (!secret) {
    // Fail closed: never compare against "Bearer undefined".
    console.error("[cron:expire-bookings] CRON_SECRET is not set");
    return Response.json({ error: "Cron is not configured" }, { status: 500 });
  }
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseService()
    .from("bookings")
    .update({ status: "expired" })
    .eq("status", "pending_payment")
    .lt("expires_at", new Date().toISOString())
    .select("id, stripe_checkout_session_id");

  if (error) {
    console.error("[cron:expire-bookings] update failed", {
      code: error.code,
      message: error.message,
    });
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  const expired = data ?? [];

  // Stripe's minimum session lifetime (30 min) outlasts the 15 min hold. Close
  // the session too, so a late payer can't pay for a seat we've released.
  // Best effort: a session that already completed/expired just rejects.
  const sessionIds = expired
    .map((b) => b.stripe_checkout_session_id)
    .filter((id): id is string => Boolean(id));
  if (sessionIds.length > 0) {
    const results = await Promise.allSettled(
      sessionIds.map((id) => stripe().checkout.sessions.expire(id)),
    );
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.warn("[cron:expire-bookings] could not expire Stripe session", {
          sessionId: sessionIds[i],
          message:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    });
  }

  // Christmas Fair: unpaid family holds and vendor approvals whose 3-day
  // payment window has passed. Capacity already ignores both; this keeps the
  // admin view honest.
  const now = new Date().toISOString();
  const [fairTickets, fairVendors] = await Promise.all([
    supabaseService().from("christmas_fair_tickets").update({ status: "expired" })
      .eq("status", "pending_payment").lt("expires_at", now).select("id, stripe_checkout_session_id"),
    supabaseService().from("christmas_fair_vendors").update({ status: "expired" })
      .eq("status", "approved").lt("payment_due_at", now).select("id"),
  ]);
  if (fairTickets.error) console.error("[cron:expire-bookings] fair ticket expiry failed", { message: fairTickets.error.message });
  if (fairVendors.error) console.error("[cron:expire-bookings] fair vendor expiry failed", { message: fairVendors.error.message });
  const fairSessionIds = (fairTickets.data ?? []).map((t) => t.stripe_checkout_session_id).filter((id): id is string => Boolean(id));
  await Promise.allSettled(fairSessionIds.map((id) => stripe().checkout.sessions.expire(id)));

  return Response.json({
    expired: expired.length,
    fairTicketsExpired: fairTickets.data?.length ?? 0,
    fairVendorsExpired: fairVendors.data?.length ?? 0,
  });
}
