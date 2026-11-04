import * as React from "react";
import { Text } from "@react-email/components";
import { formatGbp } from "@/lib/booking/pricing";
import { formatEventDate } from "@/lib/dates";
import { EmailButton } from "./components/email-button";
import { EmailLayout } from "./components/email-layout";
import { Card, DetailRow, getSiteUrl, p } from "./shared";
import type { BookingConfirmedEmailProps } from "./booking-confirmed";

export function studioStarsAdminBookingSubject(props: Pick<BookingConfirmedEmailProps, "parentName">) {
  return `New Studio Stars booking — ${props.parentName}`;
}

export function StudioStarsAdminBookingEmail(props: BookingConfirmedEmailProps) {
  const children = props.children
    .map((child) => `${child.firstName}, age ${child.age} — ${child.sessionTime}`)
    .join("; ");
  const adminUrl = `${getSiteUrl(props.siteUrl)}/admin/bookings/${encodeURIComponent(props.bookingRef)}`;

  return (
    <EmailLayout previewText={`A new paid booking for ${props.eventName}.`}>
      <Text style={{ ...p, color: "#452c86", fontWeight: 700 }}>A Studio Stars booking has been paid and confirmed.</Text>
      <Card>
        <DetailRow label="Parent" value={props.parentName} />
        <DetailRow label="Email" value={props.parentEmail} />
        <DetailRow label="Children and session times" value={children} />
        <DetailRow label="Event" value={`${props.eventName} · ${formatEventDate(props.eventDate)}`} />
        <DetailRow label="Venue" value={props.venueAddress ? `${props.venue}, ${props.venueAddress}` : props.venue} />
        <DetailRow label="Paid" value={formatGbp(props.totalPence)} />
        <DetailRow label="Booking reference" value={props.bookingRef.slice(0, 8).toUpperCase()} />
      </Card>
      <EmailButton href={adminUrl}>View booking</EmailButton>
    </EmailLayout>
  );
}
