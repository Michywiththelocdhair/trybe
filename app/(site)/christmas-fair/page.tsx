import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getChristmasFairData } from "@/lib/christmas-fair/data";

export const metadata: Metadata = {
  title: "Trybe Christmas Fair 2026",
  description: "A festive family day out with Trybe on Saturday 19 December 2026. Free family tickets and local vendors.",
};
export const instant = false;

export default async function ChristmasFairPage() {
  const fair = await getChristmasFairData();
  return (
    <div className="christmas-fair-reference overflow-hidden bg-[#FBF5EC] text-[#452C86]">
      <section className="fair-grid-paper relative overflow-hidden">
        <div className="mx-auto grid max-w-[1320px] items-center gap-8 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:min-h-[680px] lg:grid-cols-[1.06fr_.94fr] lg:gap-4 lg:px-12 lg:py-16">
          <div className="contents">
            <h1 className="order-1 display my-0 w-full text-[clamp(60px,8vw,128px)] uppercase leading-[.88] tracking-[-.01em] lg:col-start-1 lg:row-start-1">Trybe <span className="text-[#C8312B]">Christmas</span> Fair</h1>
            <p className="order-2 w-full max-w-[570px] text-[20px] leading-[1.5] sm:text-[21px] lg:col-start-1 lg:row-start-2">A free festive day out for the whole family — with a DJ, stalls from local vendors, activities for the kids and plenty of Christmas cheer.</p>
            <div className="fair-ticket order-4 my-5 flex w-full max-w-[600px] overflow-hidden rounded-[22px] bg-white shadow-[0_7px_0_#452C86] sm:my-6 lg:col-start-1 lg:row-start-3">
              <div className="flex w-[118px] shrink-0 flex-col items-center justify-center bg-[#C8312B] px-3 py-4 text-center text-white sm:w-[144px]">
                <span className="text-xs font-black uppercase tracking-widest">Saturday</span><strong className="display text-[56px] leading-none sm:text-[76px]">19</strong><span className="text-xs font-black uppercase tracking-widest">Dec 2026</span>
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1 border-l-2 border-dashed border-[#F7C6DA] px-4 py-4 sm:px-6">
                <strong className="text-[18px] sm:text-[20px]">Free entry — tickets required</strong>
                <span className="text-[14px] font-semibold sm:text-[16px]">Arrive any time · Opening times TBC</span>
                <span className="text-[14px] font-semibold sm:text-[16px]">Venue to be announced</span>
              </div>
            </div>
            <div className="order-5 flex flex-wrap gap-3 lg:col-start-1 lg:row-start-4">
              <FairButton href="/christmas-fair/book">Get free tickets <span aria-hidden="true">→</span></FairButton>
              <FairButton href="/christmas-fair/book?type=vendor" secondary>Apply to be a vendor</FairButton>
            </div>
          </div>
          <div className="fair-hero-collage order-3 relative mx-auto mt-3 h-[390px] w-full max-w-[570px] sm:h-[500px] lg:col-start-2 lg:row-start-1 lg:row-span-4 lg:mt-0 lg:h-[560px]">
            <div className="fair-sticker absolute left-[3%] top-[3%] z-10 w-[72%] rotate-[-7deg] bg-white p-2 pb-8 sm:p-3 sm:pb-10">
              <Image src="/images/christmas-fair-1.png" alt="Families enjoying a festive Trybe Christmas Fair" width={1200} height={900} priority className="h-[250px] w-full object-cover sm:h-[355px]" />
              <span className="absolute bottom-3 left-3 rounded-[10px] bg-[#452C86]/90 px-3 py-1 text-[13px] font-semibold text-white">Photo: past Trybe Christmas event</span>
            </div>
            <div className="fair-sticker absolute bottom-[2%] right-[1%] z-20 w-[58%] rotate-[8deg] bg-white p-2 pb-7 sm:p-3 sm:pb-9">
              <Image src="/images/christmas-fair-2.png" alt="Children at a past Trybe Christmas event" width={1200} height={900} className="h-[175px] w-full object-cover sm:h-[230px]" />
            </div>
            <div className="fair-stamp absolute right-[2%] top-[2%] z-30 flex size-[108px] rotate-[12deg] flex-col items-center justify-center rounded-full bg-[#C8312B] text-center text-white sm:size-[138px]"><strong className="display text-[26px] uppercase leading-none sm:text-[40px]">Free</strong><span className="text-[11px] font-black uppercase tracking-widest sm:text-[14px]">Entry</span></div>
            <div className="absolute bottom-[1%] left-[3%] z-30 flex size-[96px] -rotate-[12deg] flex-col items-center justify-center rounded-full border-[5px] border-white bg-[#F7C6DA] text-center shadow-lg sm:size-[120px]"><strong className="display text-[33px] leading-none sm:text-[46px]">20+</strong><span className="text-[10px] font-black uppercase leading-tight tracking-wider sm:text-xs">Vendors</span></div>
          </div>
        </div>
      </section>

      <div className="fair-scallop" aria-hidden="true" />
      <section id="whats-on" className="bg-[#C8312B] px-4 pb-10 pt-6 sm:px-6 sm:pb-[72px] sm:pt-12">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[28px] bg-[#FBF5EC]">
          <div className="fair-holes mb-3 flex justify-around px-3 sm:mb-5" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>
          <div className="flex flex-col items-center gap-6 px-4 pb-9 sm:gap-9 sm:px-10 sm:pb-14">
            <div className="text-center"><p className="m-0 text-sm font-black uppercase tracking-[.12em] text-[#C8312B]">Open the doors</p><h2 className="display m-0 mt-1 text-[clamp(36px,6vw,88px)] uppercase leading-[.9]"><span className="sm:hidden">What&apos;s on</span><span className="hidden sm:inline">What&apos;s on at the fair</span></h2><p className="m-0 mt-2 max-w-[520px] text-[17px] sm:text-[19px]">More doors will open as the line-up is confirmed.</p></div>
            <ol className="m-0 grid w-full list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4 sm:gap-4">
              <FairDoor number="1" title="DJ" body="Festive tunes to keep the whole family moving." color="bg-[#452C86]" text="text-white" icon="♫" />
              <FairDoor number="2" title={<><span className="sm:hidden">Money stall</span><span className="hidden sm:inline">Money jars</span></>} body={<>A hands-on activity helping kids learn about money. <span className="text-sm">[Stall name TBC]</span></>} color="bg-[#1E5B47]" text="text-white" icon="£" />
              <FairDoor number="3" title={"Kids' activities"} body="Hands-on fun for little ones. Line-up announced soon." color="bg-[#F7C6DA]" text="text-[#452C86]" icon="☆" />
              <FairDoor number="4" title="Food & treats" body="Festive food from local vendors. Line-up announced soon." color="bg-white" text="text-[#452C86]" icon="♧" />
              <FairDoor number="5" title="Crafts & gifts" body="Pick up Christmas presents from local makers." color="bg-[#BA85BA]" text="text-[#452C86]" icon="✦" />
              <FairDoor number="6" title={<><span className="hidden sm:inline">Free for families</span><span className="sm:hidden">To be revealed</span></>} body={<><span className="hidden sm:inline">Grab your free family ticket and arrive any time.</span><span className="sm:hidden">For families</span></>} color="bg-[#C8312B]" text="text-white" icon="▣" />
              <li className="fair-door hidden min-h-[225px] flex-col items-center justify-center gap-2 rounded-[24px] border-[3px] border-dashed border-[#BA85BA] p-5 text-center text-[#452C86] sm:flex"><strong className="display text-[64px] text-[#BA85BA]">7</strong><b className="text-[19px]">To be revealed</b><span className="text-sm">More to be announced</span></li>
              <li className="fair-door hidden min-h-[225px] flex-col items-center justify-center gap-2 rounded-[24px] border-[3px] border-dashed border-[#BA85BA] p-5 text-center text-[#452C86] sm:flex"><strong className="display text-[64px] text-[#BA85BA]">8</strong><b className="text-[19px]">To be revealed</b><span className="text-sm">More to be announced</span></li>
            </ol>
            <Link href="/christmas-fair/book" className="inline-flex min-h-14 items-center rounded-full bg-[#C8312B] px-7 text-[17px] font-extrabold text-white no-underline">Get free tickets</Link>
          </div>
        </div>
      </section>
      <div className="fair-checker" aria-hidden="true" />

      <section className="bg-[#FBF5EC] py-14 sm:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_.85fr] lg:items-center lg:gap-16">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[.16em] text-[#C8312B]">For families</p>
            <h2 className="display m-0 text-[clamp(46px,5.5vw,84px)] uppercase leading-[.9]">Free entry. Ticket required.</h2>
            <p className="mt-5 max-w-[590px] text-[19px] leading-relaxed">It&apos;s free to attend but places are limited — so grab your ticket early. Just tell us how many adults and children are coming. One ticket per family, up to 8 people.</p>
            <ol className="mt-7 flex list-none flex-col gap-4 p-0">
              {[["1", "Get your free ticket", "One per family, with your adult and child numbers."], ["2", "Check your inbox", "Your ticket arrives by email with a QR code."], ["3", "Get a reminder", "We'll email you the day before the fair."], ["4", "Scan & enjoy", "Show your QR code at the door — arrive any time."]].map(([n, title, detail]) => <li key={n} className="flex items-start gap-4"><span className="fair-step-number flex size-[52px] shrink-0 items-center justify-center font-black text-white">{n}</span><span className="flex flex-col"><strong className="text-[19px]">{title}</strong><span className="text-[17px] leading-snug">{detail}</span></span></li>)}
            </ol>
            <Link href="/christmas-fair/book" className="mt-7 inline-flex min-h-14 items-center rounded-full bg-[#C8312B] px-7 text-[17px] font-extrabold text-white no-underline shadow-[0_5px_0_#452C86] hover:-translate-y-0.5">Get free tickets</Link>
          </div>
          <div role="img" aria-label="Example family ticket with QR code" className="fair-ticket relative mx-auto hidden w-full max-w-[520px] rotate-[-3deg] overflow-hidden rounded-[26px] bg-[#452C86] text-white shadow-[0_12px_28px_#452C8629] md:flex">
            <div className="flex min-w-0 flex-1 flex-col gap-3 px-8 py-8"><span className="text-sm font-extrabold tracking-[.14em] text-[#F7C6DA]">ADMIT ONE FAMILY</span><h3 className="display text-[40px] uppercase leading-[.9]">Trybe Christmas Fair</h3><p className="text-[17px] text-[#F4E7F3]">Sat 19 Dec 2026 · Arrive any time</p><div className="mt-1 flex flex-wrap gap-2"><span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">2 adults</span><span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">3 children</span></div></div>
            <div className="flex w-[155px] shrink-0 flex-col items-center justify-center gap-2 border-l-[3px] border-dashed border-white/50 px-4 py-6"><div className="fair-qr flex size-[104px] items-center justify-center rounded-xl bg-white p-3" aria-hidden="true"><svg width="80" height="80" viewBox="0 0 21 21" shapeRendering="crispEdges"><path fill="#452C86" d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zM15 1v5h5V1zM16 2h3v3h-3zM0 14h7v7H0zM1 15v5h5v-5zM2 16h3v3H2zM8 0h1v2H8zM10 1h2v1h-2zM9 3h3v1H9zM8 5h2v2H8zM12 5h1v3h-1zM0 8h2v1H0zM3 8h3v1H3zM8 8h4v1H8zM14 8h2v2h-2zM18 8h3v1h-3zM1 10h2v2H1zM5 10h3v1H5zM10 10h1v3h-1zM12 10h3v1h-3zM17 10h2v2h-2zM8 12h1v2H8zM13 12h2v2h-2zM19 13h2v1h-2zM9 15h2v1H9zM12 15h1v3h-1zM14 15h3v1h-3zM18 15h1v2h-1zM8 17h3v1H8zM15 17h2v2h-2zM19 18h2v1h-2zM9 19h2v2H9zM13 19h1v2h-1zM17 20h2v1h-2z" /></svg></div><span className="text-center text-[13px] text-[#F4E7F3]">Scan at the door</span></div>
          </div>
        </div>
      </section>

      <section id="vendors" className="scroll-mt-20 bg-[#FBF5EC] px-4 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[1250px] rounded-[28px] bg-[#1E5B47] px-5 py-9 text-white sm:rounded-[36px] sm:px-10 sm:py-14 lg:px-16">
          <p className="mb-2 text-sm font-black uppercase tracking-[.16em] text-[#F7C6DA]"><span className="hidden sm:inline">Calling all makers, bakers &amp; play-makers</span><span className="sm:hidden">Makers, bakers &amp; play-makers</span></p>
          <h2 className="display m-0 text-[clamp(44px,6vw,78px)] uppercase leading-[.88]">Become a vendor</h2>
          <p className="mt-4 max-w-[760px] text-[18px] leading-relaxed sm:text-[20px]">We&apos;re looking for stalls that families will love — especially children&apos;s activities and food, plus crafts and gifts. All stall types are welcome to apply.</p>
          <div className="my-5 flex flex-wrap gap-2 text-sm font-extrabold"><span className="rounded-full bg-[#F7C6DA] px-4 py-2 text-[#452C86]">Children&apos;s activities · most wanted</span><span className="rounded-full bg-[#FBF5EC] px-4 py-2 text-[#452C86]">Food &amp; treats</span><span className="rounded-full bg-[#BA85BA] px-4 py-2 text-[#452C86]">Crafts &amp; gifts</span></div>
          <div className="my-6 grid gap-3 sm:grid-cols-3"><VendorFact big="£20" text="Pitch fee — paid only once you’re approved" /><VendorFact big="10 Dec" text="Applications close" /><VendorFact big="Tables" text="Provided for every stall" /></div>
          <ol className="my-6 hidden list-none gap-3 p-0 sm:grid sm:grid-cols-4">{[["1", "Apply online"], ["2", "We review & email you"], ["3", "Approved? Pay £20 via your link"], ["4", "Set up on the day"]].map(([n, label]) => <li key={n} className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F7C6DA] font-black text-[#452C86]">{n}</span><strong className="text-[17px]">{label}</strong></li>)}</ol>
          <Link href="/christmas-fair/book?type=vendor" className="inline-flex min-h-14 items-center rounded-full bg-[#F7C6DA] px-7 font-extrabold text-[#452C86] no-underline">Apply to be a vendor</Link>
        </div>
      </section>

      <section className="bg-[#FBF5EC] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-stretch gap-4">
          <div className="flex min-w-0 flex-[1_1_400px] flex-col justify-center gap-4">
            <p className="mb-0 text-sm font-black uppercase tracking-[.15em] text-[#C8312B]">Where &amp; when</p>
            <h2 className="display text-[clamp(46px,5.5vw,84px)] uppercase leading-[.9]">Venue coming soon</h2>
            <div className="flex max-w-[480px] flex-col gap-2 rounded-[20px] border-2 border-[#452C86] bg-white px-6 py-5 text-[18px]">
              <span><strong>Date:</strong> Saturday 19 December 2026</span>
              <span><strong>Times:</strong> <span className="tbc">Opening and closing times TBC</span> — arrive any time</span>
              <span><strong>Venue:</strong> <span className="tbc">Venue and address TBC</span></span>
            </div>
          </div>
          <div role="img" aria-label="Map placeholder, added once the venue is confirmed" className="fair-map-placeholder flex min-h-[260px] flex-[1_1_480px] items-center justify-center rounded-[28px] border-2 border-[#452C86] p-6 sm:min-h-[320px]"><span className="fair-sticker rounded-[14px] bg-[#C8312B] px-4 py-2.5 text-[17px] font-extrabold text-white">Map added once the venue is confirmed</span></div>
        </div>
      </section>

      <section id="faq" className="bg-[#FBF5EC] py-14 sm:py-20"><div className="mx-auto grid max-w-[1200px] gap-8 px-5 sm:px-8 md:grid-cols-[.7fr_1.3fr]"><div><p className="mb-2 text-sm font-black uppercase tracking-widest text-[#C8312B]">FAQs</p><h2 className="display m-0 text-[clamp(42px,5vw,64px)] uppercase leading-[.9]">Good to know</h2></div><div className="flex flex-col gap-3">
          <Question defaultOpen title="Is it really free?">Yes — entry is free for families. You just need a free family ticket, as places are limited to {fair.familyLimit} families.</Question>
          <Question title="How many tickets do we need?">One ticket covers your whole family. When you book, just tell us how many adults and children are coming. Each family ticket admits up to 8 people.</Question>
          <Question title="What time should we arrive?">Any time that suits you. Opening and closing times are still TBC.</Question>
          <Question title="How do I get in on the day?">Your ticket arrives by email with a QR code. Show it at the door to be scanned in. We&apos;ll also send a reminder the day before.</Question>
          <Question title="Vendors: when do I pay?">Only once you&apos;re approved. I&apos;ll contact you directly about the £20 pitch fee. If your application isn&apos;t successful this time, we&apos;ll let you know by email.</Question>
          <Question title="Vendors: what&apos;s provided?">A table is provided for every stall. There are {fair.vendorLimit} pitches, and applications close on 10 December 2026. Set-up times and power access are TBC.</Question>
        </div></div></section>

      <section className="bg-[#FBF5EC] px-5 py-12 sm:px-8 sm:py-16"><div className="relative mx-auto flex max-w-[1320px] flex-col items-center gap-6 overflow-hidden rounded-[36px] bg-[#C8312B] px-6 py-12 text-center text-white sm:px-12 sm:py-20"><span aria-hidden="true" className="fair-final-stamp absolute left-[6%] top-[18%] flex size-[72px] rotate-[-10deg] items-center justify-center bg-[#F7C6DA] text-[30px] font-black text-[#452C86] sm:size-[92px]">19</span><h2 className="display max-w-[900px] text-[clamp(50px,6.5vw,100px)] uppercase leading-[.9]">See you at the fair</h2><p className="text-[18px] sm:text-[20px]">Saturday 19 December 2026 · Free for families · Only {fair.familyLimit} family tickets</p><div className="flex flex-wrap justify-center gap-3"><Link href="/christmas-fair/book" className="inline-flex min-h-14 items-center rounded-full bg-white px-7 text-[18px] font-extrabold text-[#C8312B] no-underline">Get free tickets</Link><Link href="#vendors" className="inline-flex min-h-14 items-center rounded-full border-2 border-white px-7 text-[18px] font-extrabold text-white no-underline">Apply to be a vendor</Link></div></div></section>
      <div className="fair-mobile-ticket-bar fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t-2 border-[#452C86] bg-[#F7C6DA] px-4 py-3 text-[#452C86] shadow-[0_-5px_20px_#452C8640] md:hidden"><div className="leading-tight"><strong className="block text-sm">Free for families</strong><span className="text-xs font-semibold">Sat 19 Dec · {fair.familyLimit} tickets</span></div><Link href="/christmas-fair/book" className="inline-flex min-h-11 items-center rounded-full bg-[#C8312B] px-5 text-sm font-extrabold text-white no-underline">Get tickets</Link></div>
    </div>
  );
}

function FairButton({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return <Link href={href} className={`inline-flex min-h-14 items-center gap-3 rounded-full px-6 text-[16px] font-extrabold no-underline shadow-[0_5px_0_#452C86] transition-transform hover:-translate-y-0.5 ${secondary ? "border-2 border-[#452C86] bg-white text-[#452C86]" : "bg-[#C8312B] text-white"}`}>{children}</Link>;
}

function VendorFact({ big, text }: { big: string; text: string }) { return <div className="rounded-[18px] bg-[#FBF5EC] p-5 text-[#452C86]"><strong className="display text-[36px] leading-none">{big}</strong><p className="mb-0 mt-2 text-sm font-bold leading-snug">{text}</p></div>; }

function FairDoor({ number, title, body, color, text, icon }: { number: string; title: React.ReactNode; body: React.ReactNode; color: string; text: string; icon: string }) {
  return <li className={`fair-door relative flex min-h-[220px] flex-col gap-2 rounded-[24px] border-2 border-[#452C86] p-4 sm:min-h-[250px] sm:p-6 ${color} ${text}`}><span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-[#FBF5EC] font-black text-[#452C86] sm:size-11 sm:text-[22px]">{number}</span><span aria-hidden="true" className="display mt-1 text-[42px] leading-none sm:text-[56px]">{icon}</span><h3 className="display mt-auto text-[24px] uppercase leading-[.95] sm:text-[38px]">{title}</h3><p className="m-0 text-[14px] leading-snug sm:text-[17px]">{body}</p></li>;
}

function Question({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) { return <details open={defaultOpen} className="group rounded-[20px] border-2 border-[#452C86] bg-white"><summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 rounded-[20px] px-5 py-4 text-[18px] font-bold marker:hidden sm:px-6 sm:text-[20px]">{title}<span className="display text-[22px] text-[#C8312B] transition-transform group-open:rotate-45">+</span></summary><p className="mb-0 px-5 pb-4 text-[16px] leading-relaxed sm:px-6 sm:pb-5 sm:text-[18px]">{children}</p></details>; }

