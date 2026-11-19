import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms for using Trybe and booking Trybe events.",
};

const HEADING = "display text-2xl md:text-3xl";
const COPY = "text-[17px] leading-relaxed text-ink-muted";

export default function TermsPage() {
  return (
    <Container className="py-12 md:py-20">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="eyebrow">Booking with Trybe</p>
          <h1 className="display text-5xl md:text-7xl">Terms &amp; conditions</h1>
          <p className={COPY}>Last updated: 4 November 2026</p>
          <p className={COPY}>These terms apply to your use of the Trybe website and event booking services. The service is provided by Tired Ass Mum LTD (“Trybe”, “we”, “us”). By placing a booking, you agree to these terms. Please read the event details and price shown at checkout before paying.</p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Bookings and payment</h2>
          <p className={COPY}>A booking is subject to availability and is confirmed when payment has been successfully processed and we send a confirmation. Prices, event dates, venue details, session lengths and inclusions are shown on the relevant event page or at checkout. Payment is processed through Stripe Checkout. Please provide accurate contact and attendee details so we can administer the booking and share event information.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Christmas Fair family tickets</h2>
          <p className={COPY}>The Trybe Christmas Fair takes place on Saturday 19 December 2026, 12–5pm, at Acres, 12 Acklam Road, London W10 5QZ, and is a joint venture between Acres and Trybe. Entry is by a minimum donation of £2 per adult and £1 per child, paid when you book, and you may choose to add an extra donation. All entry donations go to Acres for their Christmas Day dinner. A ticket is required and places are limited. One ticket covers one family group of up to eight people; please provide an accurate headcount. Your ticket is confirmed once payment has been received, and we send the ticket QR code to the email address supplied; bring it on the day for entry. Tickets booked before entry donations were introduced remain valid.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Christmas Fair vendors</h2>
          <p className={COPY}>Submitting a vendor application does not reserve a table or create an agreement to trade. Trybe reviews applications and emails applicants with its decision. If an application is approved, we email a link to pay for the table, with the price confirmed in the approval email. Early bird tables are £25. Payment must be made within three days of approval; if it isn’t, the table may be offered to another vendor. A table is confirmed once payment has been received. Tables and chairs are provided; set-up is from 11:15am and pack-down must be finished by 5:45pm. Vendors must hold basic one-day event public liability insurance, must not run drinks-only stalls (hot drinks served alongside food are fine), and are responsible for taking and managing any bookings for paid sessions or experiences they offer. Applications close on 10 December 2026.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Children and supervision</h2>
          <p className={COPY}>A parent or guardian must make the booking and provide accurate information about each child attending. The booking form will ask whether you will stay with your child or drop them off. Please follow the supervision arrangements and any age, safety or attendance instructions given for the specific event. Tell us promptly if relevant attendee information changes.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Cancellation and refunds</h2>
          <p className={COPY}>To cancel a booking, email <a className="underline" href="mailto:trybeappuk@gmail.com">trybeappuk@gmail.com</a> with your booking details. If we receive your cancellation at least 7 days before the event date, we will refund the amount paid for the cancelled booking. Cancellations received less than 7 days before the event are not eligible for a refund under this policy. This policy does not affect any rights you have under applicable law.</p>
          <p className={COPY}>If Trybe cancels an event, we will contact affected bookers about the available arrangements. Nothing in these terms limits any rights or remedies that apply by law.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Changes to an event</h2>
          <p className={COPY}>We may need to make reasonable changes to timings, activities, staff or arrangements. If a significant change affects your booking, we will contact you using the details provided. Where an event is postponed or materially changed, we will explain the options available to you.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Using this website</h2>
          <p className={COPY}>Please use the website lawfully and do not interfere with its operation, attempt unauthorised access, or submit information that is false, harmful or unlawful. Website content is provided for general information and may be updated. Event-specific details displayed at the time of booking apply to that booking.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Liability and your legal rights</h2>
          <p className={COPY}>Nothing in these terms excludes or limits liability where it would be unlawful to do so, including liability for death or personal injury caused by negligence, fraud, or your statutory consumer rights. Subject to that, Trybe is not responsible for losses that were not reasonably foreseeable when you booked, or for matters outside our reasonable control.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Privacy and contact</h2>
          <p className={COPY}>Our <Link className="underline" href="/privacy">Privacy Policy</Link> explains how we handle personal information. For booking changes or general enquiries, email <a className="underline" href="mailto:trybeappuk@gmail.com">trybeappuk@gmail.com</a>. For privacy requests, email <a className="underline" href="mailto:tiredassmum@gmail.com">tiredassmum@gmail.com</a>.</p>
        </section>
      </article>
    </Container>
  );
}
