import * as React from "react";
import { Img, Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { Card, DetailRow, Greeting, Title, getSiteUrl, p } from "./shared";
import { formatEventDate } from "@/lib/dates";

export type ChristmasFairTicketEmailProps = {
  familyName: string;
  email: string;
  adults: number;
  children: number;
  ticketCode: string;
  eventDate: string;
  ticketUrl: string;
};

export function christmasFairTicketSubject() {
  return "Your free Trybe Christmas Fair ticket 🎄";
}

export function ChristmasFairTicketEmail(props: ChristmasFairTicketEmailProps) {
  return (
    <EmailLayout previewText="Your family ticket and QR code for the Trybe Christmas Fair.">
      <Title>Your family ticket is ready!</Title>
      <Greeting name={props.familyName} />
      <Text style={p}>Your free family ticket is confirmed. Show the QR code below when you arrive.</Text>
      <Card>
        <DetailRow label="Event" value="Trybe Christmas Fair" />
        <DetailRow label="Date" value={formatEventDate(props.eventDate)} />
        <DetailRow label="Family size" value={`${props.adults} ${props.adults === 1 ? "adult" : "adults"} · ${props.children} ${props.children === 1 ? "child" : "children"}`} />
        <DetailRow label="Venue" value="To be announced" />
        <Text style={{ ...p, textAlign: "center", marginTop: 24, fontWeight: 800 }}>Your entry QR code</Text>
        <Img src="cid:christmas-fair-ticket-qr" alt={`QR code for ticket ${props.ticketCode}`} width="220" height="220" style={{ display: "block", margin: "0 auto" }} />
        <Text style={{ ...p, textAlign: "center", fontWeight: 800 }}>Ticket code: {props.ticketCode.slice(0, 8).toUpperCase()}</Text>
      </Card>
      <Text style={p}>Opening hours and venue details are still being confirmed. We&apos;ll email you a reminder with the latest information on 18 December.</Text>
      <EmailButton href={props.ticketUrl}>View your ticket</EmailButton>
    </EmailLayout>
  );
}

export type ChristmasFairReminderEmailProps = {
  familyName: string;
  adults: number;
  children: number;
  eventDate: string;
  ticketUrl: string;
};

export function christmasFairReminderSubject() {
  return "Tomorrow: Trybe Christmas Fair 🎄";
}

export function ChristmasFairVendorReceivedEmail({
  contactName,
  businessName,
}: {
  contactName: string;
  businessName: string;
}) {
  return (
    <EmailLayout previewText="We’ve received your Christmas Fair vendor application.">
      <Title>Application received</Title>
      <Greeting name={contactName} />
      <Text style={p}>Thanks for applying to bring {businessName} to the Trybe Christmas Fair. We&apos;ve received your application and will review it.</Text>
      <Text style={p}>If your application is accepted, Trybe will contact you directly about arranging the £20 pitch fee. There&apos;s no payment to make now.</Text>
    </EmailLayout>
  );
}

export function christmasFairVendorReceivedSubject() {
  return "We’ve received your Trybe Christmas Fair application";
}

export function ChristmasFairReminderEmail(props: ChristmasFairReminderEmailProps) {
  return (
    <EmailLayout previewText="A reminder about your Trybe Christmas Fair family ticket.">
      <Title>The fair is tomorrow!</Title>
      <Greeting name={props.familyName} />
      <Text style={p}>We&apos;re looking forward to seeing your family at the Trybe Christmas Fair on {formatEventDate(props.eventDate)}.</Text>
      <Text style={p}>Venue and opening hours are still to be confirmed. We&apos;ll share the details as soon as they&apos;re ready. Please bring your family QR ticket when you arrive.</Text>
      <EmailButton href={props.ticketUrl}>View your family ticket</EmailButton>
    </EmailLayout>
  );
}

export function ChristmasFairAdminNotice({
  title,
  lines,
  href,
}: {
  title: string;
  lines: string[];
  href: string;
}) {
  return (
    <EmailLayout previewText={title}>
      <Title>{title}</Title>
      <Card>
        {lines.map((line) => <Text key={line} style={p}>{line}</Text>)}
      </Card>
      <EmailButton href={href}>Open Christmas Fair admin</EmailButton>
    </EmailLayout>
  );
}

export function christmasFairAdminSubject(title: string) {
  return title;
}

export function christmasFairTicketUrl(ticketCode: string) {
  return `${getSiteUrl()}/christmas-fair/ticket/${encodeURIComponent(ticketCode)}`;
}
