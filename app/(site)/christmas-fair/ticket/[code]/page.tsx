import type { Metadata } from "next";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { formatEventDate } from "@/lib/dates";
import { supabaseService } from "@/lib/supabase/service";
import { christmasFairTicketUrl } from "@/lib/email/templates/christmas-fair";

export const metadata: Metadata = { title: "Your Christmas Fair Ticket" };
export const instant = false;

export default async function ChristmasFairTicketPage({ params }: PageProps<"/christmas-fair/ticket/[code]">) {
  const { code } = await params;
  const { data: ticket, error } = await supabaseService()
    .from("christmas_fair_tickets")
    .select("ticket_code, family_name, adult_count, child_count, status")
    .eq("ticket_code", code)
    .maybeSingle();
  if (error || !ticket || ticket.status !== "confirmed") notFound();

  const qr = await QRCode.toDataURL(christmasFairTicketUrl(ticket.ticket_code), { width: 480, margin: 2 });
  return (
    <section className="min-h-[70vh] bg-[#FBF5EC] py-12 text-[#452C86]">
      <Container className="mx-auto max-w-2xl">
        <div className="rounded-[30px] bg-white p-6 text-center shadow-sm sm:p-10">
          <p className="m-0 text-sm font-extrabold uppercase tracking-[.14em] text-[#C8312B]">Trybe Christmas Fair</p>
          <h1 className="display mt-3 text-4xl uppercase sm:text-5xl">Your family ticket</h1>
          <p className="mt-2 text-lg">{formatEventDate("2026-12-19")} · Venue and opening hours TBC</p>
          <img src={qr} alt="Your Christmas Fair entry QR code" width={240} height={240} className="mx-auto mt-5 size-60" />
          <p className="text-sm font-bold uppercase tracking-widest text-[color:var(--muted-plum)]">Ticket code</p>
          <p className="display m-0 text-3xl">{ticket.ticket_code.slice(0, 8).toUpperCase()}</p>
          <div className="mt-6 rounded-[20px] bg-[#F4E7F3] p-5 text-left">
            <p className="m-0"><strong>Family:</strong> {ticket.family_name}</p>
            <p className="m-0 mt-1"><strong>Party:</strong> {ticket.adult_count} {ticket.adult_count === 1 ? "adult" : "adults"} · {ticket.child_count} {ticket.child_count === 1 ? "child" : "children"}</p>
            <p className="m-0 mt-3 text-sm">Show this QR code at the entrance. You can save this page or use the QR ticket emailed to you.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
