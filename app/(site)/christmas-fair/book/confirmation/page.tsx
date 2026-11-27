import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/service";
import { FAIR, charityLine, formatPence } from "@/lib/christmas-fair/config";

export const metadata: Metadata = {
  title: "Your Christmas Fair ticket",
  robots: { index: false, follow: false },
};
export const instant = false;

/**
 * Where Stripe sends a family after paying. The ticket is confirmed by the
 * Stripe webhook, which can land a moment after this redirect, so this page
 * shows a "processing" state until then. The ticket code is a random uuid.
 */
export default async function FairTicketConfirmationPage({ searchParams }: PageProps<"/christmas-fair/book/confirmation">) {
  const query = await searchParams;
  const code = z.uuid().safeParse(query.ticket);
  const ticket = code.success
    ? (await supabaseService().from("christmas_fair_tickets")
        .select("ticket_code, family_name, email, adult_count, child_count, status, amount_paid_pence, minimum_donation_pence, extra_donation_pence")
        .eq("ticket_code", code.data).maybeSingle()).data
    : null;

  return (
    <section className="fair-grid-paper min-h-[75vh] px-4 py-12 text-[#452C86] sm:py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 rounded-[30px] border-2 border-[#452C86] bg-white p-6 text-center shadow-[0_8px_0_#452C86] sm:p-10">
        <p className="m-0 text-sm font-extrabold uppercase tracking-[.14em] text-[#C8312B]">Trybe Christmas Fair</p>
        {!ticket ? (
          <>
            <h1 className="display m-0 text-4xl uppercase sm:text-5xl">We can’t find that ticket</h1>
            <p className="m-0 text-lg">If you’ve paid, your ticket will arrive by email shortly. If it doesn’t, email <a className="font-bold underline" href={`mailto:${FAIR.adminEmail}`}>{FAIR.adminEmail}</a>.</p>
          </>
        ) : ticket.status === "confirmed" ? (
          <>
            <h1 className="display m-0 text-4xl uppercase sm:text-6xl">You’re coming to the fair!</h1>
            <p className="m-0 text-lg">Thank you! Your donation of <strong>{formatPence(ticket.amount_paid_pence ?? ticket.minimum_donation_pence + ticket.extra_donation_pence)}</strong> goes to {charityLine}. We’ve emailed your QR ticket to <strong>{ticket.email}</strong>.</p>
            <div className="rounded-[20px] bg-[#F4E7F3] p-5 text-left">
              <p className="m-0"><strong>When:</strong> {FAIR.dateLabel}, {FAIR.timeLabel} (arrive any time)</p>
              <p className="m-0 mt-1"><strong>Where:</strong> {FAIR.venue}, {FAIR.address}</p>
              <p className="m-0 mt-1"><strong>Family:</strong> {ticket.adult_count} {ticket.adult_count === 1 ? "adult" : "adults"} · {ticket.child_count} {ticket.child_count === 1 ? "child" : "children"}</p>
            </div>
            <Link href={`/christmas-fair/ticket/${ticket.ticket_code}`} className="mx-auto inline-flex min-h-14 items-center rounded-full bg-[#C8312B] px-7 text-[17px] font-extrabold text-white no-underline">Open your ticket</Link>
          </>
        ) : ticket.status === "pending_payment" || ticket.status === "expired" ? (
          <>
            <h1 className="display m-0 text-4xl uppercase sm:text-5xl">Confirming your payment…</h1>
            <p className="m-0 text-lg">This usually takes a few seconds. Refresh this page, or look out for your QR ticket at <strong>{ticket.email}</strong>.</p>
            <Link href={`/christmas-fair/book/confirmation?ticket=${ticket.ticket_code}`} className="mx-auto inline-flex min-h-12 items-center rounded-full border-2 border-[#452C86] px-6 font-extrabold text-[#452C86] no-underline">Refresh</Link>
          </>
        ) : (
          <>
            <h1 className="display m-0 text-4xl uppercase sm:text-5xl">This ticket isn’t active</h1>
            <p className="m-0 text-lg">Please email <a className="font-bold underline" href={`mailto:${FAIR.adminEmail}`}>{FAIR.adminEmail}</a> and we’ll help.</p>
          </>
        )}
      </div>
    </section>
  );
}
