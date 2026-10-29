import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { BookingForm, type BookingEvent } from "./booking-form";

export const metadata: Metadata = {
  title: "Book your child's slot — Studio Stars",
  description: "Reserve a Studio Stars spot. £100 per child, siblings 20% off.",
};

// Event details from the design (HomeMobile.dc.html / Booking.dc.html).
const EVENT: BookingEvent = {
  name: "Studio Stars",
  dateLabel: "Sat 5 Dec 2026",
  venue: "The Qube",
  parking: "Parking available",
};

/**
 * Server Component wrapper. The root layout already provides SiteNav, SiteFooter
 * and <main>, and the studio-stars layout paints night behind us, so this page
 * lays down its own light full-bleed surface (the design's booking flow is light).
 */
export default function BookPage() {
  return (
    <div className="bg-[color:var(--surface-sunk)] text-night">
      <Container>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 pb-20 pt-6 md:pt-10">
          <Link
            href="/studio-stars"
            className="inline-flex min-h-[44px] items-center gap-2 self-start text-[17px] font-bold text-night no-underline hover:underline"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Back to Studio Stars
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-[6px]">
              <p className="text-[14px] font-extrabold uppercase tracking-[0.1em] text-trybe-purple">
                {EVENT.name} · {EVENT.dateLabel} · {EVENT.venue}
              </p>
              <h1 className="display text-[length:clamp(42px,5vw,68px)]">
                Book your child’s session
              </h1>
            </div>
            {/* Phase 3: remove once bookings and payments are live. */}
            <span className="inline-flex items-center rounded-pill border border-dashed border-lavender bg-white px-[14px] py-[6px] text-[15px] font-bold text-indigo">
              Prototype — no booking or payment is made
            </span>
          </div>

          <BookingForm event={EVENT} />
        </div>
      </Container>
    </div>
  );
}
