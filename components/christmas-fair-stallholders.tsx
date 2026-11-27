"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import type { Stallholder } from "@/lib/christmas-fair/stallholders";

/**
 * "Meet the stallholders": a compact logo grid. Tapping a logo opens a panel
 * underneath with a photo, a short bio and links, so the section stays small
 * however many vendors join.
 */
export function ChristmasFairStallholders({ stallholders }: { stallholders: Stallholder[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const panelId = useId();
  const open = stallholders.find((s) => s.id === openId) ?? null;

  return (
    <section id="stallholders" aria-labelledby="stallholders-title" className="scroll-mt-20 bg-[#FBF5EC] px-5 pt-14 sm:px-8 sm:pt-20">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 sm:gap-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <p className="m-0 text-sm font-black uppercase tracking-[.16em] text-[#C8312B]">Who’s coming</p>
            <h2 id="stallholders-title" className="display m-0 mt-2 text-[clamp(44px,5.5vw,84px)] uppercase leading-[.9]">Meet the stallholders</h2>
          </div>
          <p className="m-0 max-w-[440px] text-[17px] leading-relaxed sm:text-[19px]">Local makers, artists and bakers, with more joining every week. Tap a logo to find out more.</p>
        </div>

        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 min-[480px]:grid-cols-3 sm:gap-4 md:grid-cols-5">
          {stallholders.map((s) => {
            const selected = s.id === openId;
            return (
              <li key={s.id} className="flex">
                <button
                  type="button"
                  aria-expanded={selected}
                  aria-controls={panelId}
                  onClick={() => setOpenId(selected ? null : s.id)}
                  className={`flex min-w-0 flex-1 cursor-pointer flex-col gap-1.5 rounded-[20px] border-2 border-[#452C86] p-2.5 pb-3.5 text-left font-[inherit] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#452C86] ${selected ? "bg-[#F7C6DA] outline outline-4 outline-offset-[3px] outline-[#C8312B]" : "bg-[#F4E7F3]"}`}
                >
                  <span className="relative flex h-[96px] items-center justify-center rounded-[14px] bg-white p-2.5 sm:h-[120px]">
                    <Image src={s.logo} alt="" width={400} height={400} className="max-h-full w-auto max-w-full object-contain" />
                  </span>
                  <span className="text-[14px] font-extrabold leading-tight text-[#452C86] sm:text-[15px]">{s.name}</span>
                  <span className="text-[12px] font-bold text-[#6D5DA8]">{s.kind}</span>
                </button>
              </li>
            );
          })}
          <li className="flex">
            <Link href="/christmas-fair/book?type=vendor" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-[#1E5B47] bg-[#1E5B47] p-3 text-center text-white no-underline transition-transform hover:-translate-y-0.5">
              <span aria-hidden="true" className="flex size-[54px] items-center justify-center rounded-full border-2 border-dashed border-[#F7C6DA] text-[30px] font-black leading-none">+</span>
              <span className="text-[14px] font-extrabold leading-tight sm:text-[15px]">Your stall here?</span>
              <span className="text-[12px] font-bold text-[#F7C6DA]">Apply for a table</span>
            </Link>
          </li>
        </ul>

        <div id={panelId} aria-live="polite">
          {open ? (
            <div className="relative flex flex-col gap-5 rounded-[24px] border-2 border-[#452C86] bg-white p-4 sm:rounded-[28px] sm:p-6 md:flex-row md:gap-7">
              <button type="button" aria-label={`Close ${open.name}`} onClick={() => setOpenId(null)} className="absolute right-3 top-3 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full border-2 border-[#452C86] bg-white text-[#452C86]">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
              <div className="flex shrink-0 flex-col gap-2.5">
                <Image src={open.photos[0].src} alt={open.photos[0].alt} width={900} height={900} className="h-[240px] w-full rounded-[18px] object-cover md:size-[300px]" />
                {open.photos.length > 1 ? (
                  <div className="hidden gap-2.5 md:flex">
                    {open.photos.slice(1).map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} width={300} height={300} className="size-[145px] rounded-[14px] object-cover" />)}
                  </div>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:pr-12">
                <span className={`self-start rounded-full border-2 border-[#452C86] px-3 py-1 text-[13px] font-extrabold ${open.category === "Food & treats" ? "bg-[#FBF5EC]" : "bg-[#F7C6DA]"}`}>{open.category}</span>
                <h3 className="display m-0 pr-12 text-[30px] uppercase leading-[.95] sm:text-[40px] md:pr-0">{open.name}</h3>
                <p className="m-0 max-w-[560px] text-[16px] leading-relaxed sm:text-[18px]">{open.bio}</p>
                <div className="mt-auto flex flex-wrap gap-2.5 pt-1.5">
                  <a href={`https://www.instagram.com/${open.instagram}/`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#452C86] px-5 text-[16px] font-extrabold text-white no-underline">
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
                    @{open.instagram}<span className="sr-only"> on Instagram (opens in a new tab)</span>
                  </a>
                  {open.website ? (
                    <a href={open.website.url} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#452C86] bg-white px-5 text-[16px] font-extrabold text-[#452C86] no-underline">
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
                      {open.website.label}<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
