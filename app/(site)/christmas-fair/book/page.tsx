import type { Metadata } from "next";
import { ChristmasFairBooking } from "@/components/christmas-fair-booking";
import { getChristmasFairData } from "@/lib/christmas-fair/data";

export const metadata: Metadata = { title: "Tickets & Vendor Applications · Christmas Fair" };
export const instant = false;

export default async function ChristmasFairBookPage({
  searchParams,
}: PageProps<"/christmas-fair/book">) {
  const query = await searchParams;
  const fair = await getChristmasFairData();
  return (
    <section className="christmas-fair-booking-reference fair-grid-paper min-h-[85vh] px-4 py-8 text-[#452C86] sm:px-6 sm:py-10">
      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="m-0 text-[13px] font-black uppercase tracking-[.14em] text-[#C8312B]">Trybe Christmas Fair · Sat 19 Dec 2026</p><h1 className="display m-0 mt-1 text-[clamp(44px,6vw,72px)] uppercase leading-[.9]">{query.type === "vendor" ? "Become a vendor" : "Free family tickets"}</h1></div>
          <span className="inline-flex rounded-full border border-dashed border-[#9273B1] bg-white px-4 py-2 text-sm font-bold">Free entry · Times and venue TBC</span>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ChristmasFairBooking
            activeTab={query.type === "vendor" ? "vendor" : "family"}
            familyTicketsRemaining={fair.familyTicketsRemaining}
            vendorPitchesRemaining={fair.vendorPitchesRemaining}
          />
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div className="rounded-[22px] bg-[#C8312B] p-6 text-white shadow-[0_6px_0_#452C86]">
              <p className="m-0 text-sm font-extrabold uppercase tracking-widest text-[#F7C6DA]">Trybe presents</p><h2 className="display mt-2 text-[42px] uppercase leading-[.88]">Christmas<br />Fair</h2><p className="mb-0 mt-4 text-[18px] font-bold">Saturday 19 December 2026</p><p className="mb-0 mt-1">Opening times TBC · Venue TBC</p>
            </div>
            {query.type === "vendor" ? <div className="rounded-[22px] bg-[#1E5B47] p-6 text-white"><strong className="display text-[33px] uppercase">Vendor pitch</strong><p className="mb-0 mt-2">£20 only after acceptance. We’ll contact you directly if your application is accepted.</p></div> : <div className="rounded-[22px] border-2 border-[#452C86] bg-white p-6"><strong className="display text-[30px] uppercase">Your family</strong><p className="mb-0 mt-2 leading-relaxed">One free ticket covers up to 8 people. Add your group size and we’ll email your QR ticket.</p></div>}
            <p className="m-0 px-1 text-sm font-semibold">Questions? <a className="font-extrabold underline" href="mailto:trybeappuk@gmail.com">Email Trybe</a></p>
          </aside>
        </div>
      </main>
    </section>
  );
}
