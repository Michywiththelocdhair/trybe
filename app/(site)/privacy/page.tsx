import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Tired Ass Mum LTD (Trybe) collects and uses personal information.",
};

const HEADING = "display text-2xl md:text-3xl";
const COPY = "text-[17px] leading-relaxed text-ink-muted";

export default function PrivacyPage() {
  return (
    <Container className="py-12 md:py-20">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="eyebrow">Your information</p>
          <h1 className="display text-5xl md:text-7xl">Privacy policy</h1>
          <p className={COPY}>Last updated: 4 November 2026</p>
          <p className={COPY}>
            This policy explains how Tired Ass Mum LTD (trading as Trybe, “we”, “us”) handles personal information when you visit our website, join our email list, or book a Trybe event.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Who is responsible for your information?</h2>
          <p className={COPY}>Tired Ass Mum LTD is the organisation responsible for personal information described in this policy. For privacy questions or requests, email <a className="underline" href="mailto:tiredassmum@gmail.com">tiredassmum@gmail.com</a>.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>What we collect and why</h2>
          <ul className={`${COPY} list-disc space-y-2 pl-6`}>
            <li><strong>Event bookings:</strong> parent or guardian name, email address and phone number; each child’s first name and age; your preferred session time and whether you plan to stay or drop off. We use this to manage the booking, take payment, communicate event arrangements and keep appropriate booking records.</li>
            <li><strong>Christmas Fair family tickets:</strong> lead adult’s name, email address, optional phone number, and the number of adults and children in the family group. We use these details to issue a QR entry ticket, manage the family capacity, send an event reminder and share venue and opening-time updates. The QR ticket contains a random ticket reference, not your contact details.</li>
            <li><strong>Christmas Fair vendor applications:</strong> business and contact names, email address, phone number, stall category and description, optional website or social link, power needs, insurance status and (for food stalls) food hygiene rating. We use this to review applications, contact applicants and manage accepted pitches.</li>
            <li><strong>Payments:</strong> payment is taken through Stripe Checkout. We receive payment and transaction details needed to confirm and administer your booking. Your full card details are handled by Stripe and are not stored by Trybe.</li>
            <li><strong>Email updates:</strong> if you submit your email through our signup form, we use it to manage your subscription and send Trybe updates. You can ask us to stop these emails at any time by replying to an email or contacting us.</li>
            <li><strong>Messages to us:</strong> if you contact us, we use the details and message you provide to respond and keep a record where needed to handle your enquiry.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Our service providers</h2>
          <p className={COPY}>We use service providers to run the website and services, including Supabase for booking records, Stripe for payment processing, and Resend for email delivery and email-list management. They process information on our behalf or as independent providers under their own terms and privacy notices. We do not sell your personal information.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>How long we keep information</h2>
          <p className={COPY}>We keep information only for as long as it is needed for the purposes described here, including managing bookings, responding to enquiries, meeting legal and accounting requirements, and resolving disputes. We remove or anonymise it when it is no longer needed. You can unsubscribe from marketing updates at any time; we may retain a minimal record of your request so we can respect it.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Your choices and rights</h2>
          <p className={COPY}>Depending on the circumstances, you may have the right to request access to, correction or deletion of your personal information, to restrict or object to certain uses, or to receive a copy in a portable format. You can also withdraw consent where processing relies on consent. To make a request, email <a className="underline" href="mailto:tiredassmum@gmail.com">tiredassmum@gmail.com</a>. You may complain to the UK Information Commissioner’s Office (ICO) if you are concerned about how your information is handled.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Cookies and external links</h2>
          <p className={COPY}>Our public pages do not currently use advertising or analytics cookies. Essential technical storage may be used to operate the website and secure account features. The Studio Stars page embeds a Google Map; loading it may share technical information such as your IP address and browser details with Google, which may use cookies under its own privacy policy. When you continue to Stripe Checkout, Stripe may also use its own cookies and similar technologies. External services are governed by their own privacy policies.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={HEADING}>Changes and contact</h2>
          <p className={COPY}>We may update this policy as our services or practices change. The latest version will be posted on this page with its revision date. For general enquiries, contact <a className="underline" href="mailto:trybeappuk@gmail.com">trybeappuk@gmail.com</a>. Read our <Link className="underline" href="/terms">Terms &amp; Conditions</Link>.</p>
        </section>
      </article>
    </Container>
  );
}
