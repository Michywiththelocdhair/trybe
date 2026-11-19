import type { Metadata } from "next";
import { ChristmasFairBooking } from "@/components/christmas-fair-booking";
import { getChristmasFairData } from "@/lib/christmas-fair/data";
import { FAIR, formatPence, vendorApplicationsOpen } from "@/lib/christmas-fair/config";

export const metadata: Metadata = {
  title: "Family Tickets & Vendor Applications · Christmas Fair",
  description: "Book your family ticket for the Trybe Christmas Fair at Acres (£2 adults, £1 children, all donated to Acres), or apply for a vendor table.",
};
export const instant = false;

export default async function ChristmasFairBookPage({
  searchParams,
}: PageProps<"/christmas-fair/book">) {
  const query = await searchParams;
  const fair = await getChristmasFairData();
  const isVendor = query.type === "vendor";
  return (
    <section className="christmas-fair-booking-reference fair-grid-paper min-h-[85vh] px-4 py-8 text-[#452C86] sm:px-6 sm:py-10">
      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="m-0 text-[13px] font-black uppercase tracking-[.14em] text-[#C8312B]">Trybe Christmas Fair · {FAIR.shortDateLabel} · {FAIR.timeLabel} · {FAIR.venue}</p><h1 className="display m-0 mt-1 text-[clamp(44px,6vw,72px)] uppercase leading-[.9]">{isVendor ? "Become a vendor" : "Family tickets"}</h1></div>
          <span className="inline-flex rounded-full border border-dashed border-[#9273B1] bg-white px-4 py-2 text-sm font-bold">{isVendor ? `Tables from ${formatPence(FAIR.earlyBirdPricePence)} · apply by ${FAIR.vendorDeadlineLabel}` : "Entry by donation: £2 adults · £1 children"}</span>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ChristmasFairBooking
            activeTab={isVendor ? "vendor" : "family"}
            familyTicketsRemaining={fair.familyTicketsRemaining}
            vendorPitchesRemaining={fair.vendorPitchesRemaining}
            vendorApplicationsOpen={vendorApplicationsOpen()}
            cancelled={query.cancelled === "1"}
          />
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div className="rounded-[22px] bg-[#C8312B] p-6 text-white shadow-[0_6px_0_#452C86]">
              <p className="m-0 text-sm font-extrabold uppercase tracking-widest text-[#F7C6DA]">Acres × Trybe</p>
              <h2 className="display mt-2 text-[42px] uppercase leading-[.88]">Christmas<br />Fair</h2>
              <p className="mb-0 mt-4 text-[18px] font-bold">{FAIR.dateLabel}</p>
              <p className="mb-0 mt-1 font-semibold">{FAIR.timeLabel} · arrive any time</p>
              <p className="mb-0 mt-3 text-[15px] leading-snug">{FAIR.venue}, {FAIR.address}<br />{FAIR.directions}</p>
            </div>
            {isVendor ? (
              <div className="rounded-[22px] bg-[#1E5B47] p-6 text-white">
                <strong className="display text-[30px] uppercase">Vendor tables</strong>
                <ul className="mb-0 mt-3 flex list-none flex-col gap-2 p-0 text-[15px] leading-snug">
                  <li><strong>{formatPence(FAIR.earlyBirdPricePence)}</strong> early bird for the first {FAIR.earlyBirdTables} tables ({fair.earlyBirdTablesRemaining} left), then <strong>{formatPence(FAIR.standardPricePence)}</strong></li>
                  <li>Pay only once you’re approved, within {FAIR.vendorPaymentDays} days</li>
                  <li>Tables and chairs provided</li>
                  <li>Set up from {FAIR.setUpLabel}, packed down by {FAIR.packDownLabel}</li>
                  <li>One-day public liability insurance needed</li>
                </ul>
              </div>
            ) : (
              <div className="rounded-[22px] border-2 border-[#452C86] bg-white p-6">
                <strong className="display text-[30px] uppercase">Where it goes</strong>
                <p className="mb-0 mt-2 leading-relaxed">Your whole entry donation goes to Acres, who are putting on a Christmas Day dinner for people having a tough year. One ticket covers up to {FAIR.maxPeoplePerTicket} people, and we’ll email your QR ticket as soon as you’ve paid.</p>
              </div>
            )}
            <p className="m-0 px-1 text-sm font-semibold">Questions? <a className="font-extrabold underline" href={`mailto:${FAIR.adminEmail}`}>Email Trybe</a></p>
          </aside>
        </div>
      </main>
    </section>
  );
}
