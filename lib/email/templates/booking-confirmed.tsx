import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { emailColors } from "./components/email-theme";
import { formatEventDate } from "@/lib/dates";
import { formatGbp } from "@/lib/booking/pricing";
import { Card, CtaWrap, DetailRow, Greeting, Title, getSiteUrl, h2, p } from "./shared";

export type BookingConfirmedEmailProps = {
  parentName: string;
  parentEmail: string;
  children: { firstName: string; age: number }[];
  eventName: string;
  eventSubtitle: string;
  eventDate: string;
  venue: string;
  totalPence: number;
  bookingRef: string;
  siteUrl?: string;
};

export function bookingConfirmedSubject(
  _props?: Partial<BookingConfirmedEmailProps>,
): string {
  return "You're booked! 🎄 Studio Stars";
}

export function BookingConfirmedEmail(props: BookingConfirmedEmailProps) {
  const { parentName, children, eventName, eventSubtitle, eventDate, venue, totalPence, bookingRef } = props;
  const siteUrl = getSiteUrl(props.siteUrl);
  const href = `${siteUrl}/studio-stars/book/booking-confirmation?booking=${encodeURIComponent(bookingRef)}`;
  const kids = children.map((c) => `${c.firstName} (${c.age})`).join(", ");

  return (
    <EmailLayout previewText={`You're booked for ${eventName} on ${formatEventDate(eventDate)}.`}>
      <Title>You&apos;re booked!</Title>
      <Greeting name={parentName} />
      <Text style={p}>
        Thank you for booking {eventName}
        {eventSubtitle ? ` — ${eventSubtitle}` : ""}. We&apos;re so excited to have your little stars with us.
      </Text>

      <Card>
        <DetailRow label="Event" value={eventName} />
        <DetailRow label="Date" value={formatEventDate(eventDate)} />
        <DetailRow label="Venue" value={venue} />
        <DetailRow label={children.length === 1 ? "Child" : "Children"} value={kids} />
        <DetailRow label="Total paid" value={<strong style={{ color: emailColors.purple }}>{formatGbp(totalPence)}</strong>} />
        <Text style={{ ...p, margin: 0, fontSize: "13px", lineHeight: "20px" }}>
          Booking ref: {bookingRef.slice(0, 8).toUpperCase()}
        </Text>
      </Card>

      <Text style={h2}>What happens next</Text>
      <Text style={p}>
        1. We&apos;ll email you a song list so your child can start choosing and practising their favourites.
      </Text>
      <Text style={p}>
        2. Closer to the day, we&apos;ll send arrival info so you know exactly where to go and when.
      </Text>

      <CtaWrap>
        <EmailButton href={href}>View your booking</EmailButton>
      </CtaWrap>
    </EmailLayout>
  );
}

export default BookingConfirmedEmail;

BookingConfirmedEmail.PreviewProps = {
  parentName: "Sam Taylor",
  parentEmail: "sam@example.com",
  children: [{ firstName: "Ava", age: 7 }, { firstName: "Leo", age: 5 }],
  eventName: "Studio Stars",
  eventSubtitle: "Christmas Edition",
  eventDate: "2026-12-05",
  venue: "The Studio, London",
  totalPence: 18000,
  bookingRef: "3f9a1c2e-0000-4000-8000-000000000000",
} satisfies BookingConfirmedEmailProps;
