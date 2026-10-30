import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { emailColors, emailFonts } from "./components/email-theme";
import { formatEventDate } from "@/lib/dates";
import { Card, CtaWrap, DetailRow, Greeting, Title, getSiteUrl, h2, joinNames, p } from "./shared";

export type Reminder48hEmailProps = {
  parentName: string;
  eventName: string;
  eventDate: string;
  venue: string;
  venueAddress: string;
  childNames: string[];
  siteUrl?: string;
};

export function reminder48hSubject(props: Pick<Reminder48hEmailProps, "eventName">): string {
  return `${props.eventName} is in 2 days! 🎤`;
}

const checklist = [
  "Arrive 10 minutes early so everyone can settle in",
  "Wear comfortable clothes they can move in",
  "Bring a water bottle",
];

export function Reminder48hEmail(props: Reminder48hEmailProps) {
  const { parentName, eventName, eventDate, venue, venueAddress, childNames } = props;
  const date = formatEventDate(eventDate);
  return (
    <EmailLayout previewText={`${eventName} is on ${date} — here's everything you need.`}>
      <Title>Nearly showtime!</Title>
      <Greeting name={parentName} />
      <Text style={p}>
        Just a reminder — {eventName} is on {date}!
        {childNames.length > 0 ? ` ${joinNames(childNames)} will have a brilliant time.` : ""}
      </Text>

      <Card>
        <DetailRow label="Date" value={date} />
        <DetailRow label="Venue" value={venue} />
        <DetailRow label="Address" value={venueAddress} />
      </Card>

      <Text style={h2}>Quick checklist</Text>
      {checklist.map((item) => (
        <Text key={item} style={{ ...p, margin: "0 0 8px", fontFamily: emailFonts.body }}>
          <span style={{ color: emailColors.purple, fontWeight: 700 }}>✓</span>&nbsp; {item}
        </Text>
      ))}

      <CtaWrap>
        <div style={{ height: "16px" }} />
        <EmailButton href={`${getSiteUrl(props.siteUrl)}/studio-stars`}>View event details</EmailButton>
      </CtaWrap>
    </EmailLayout>
  );
}

export default Reminder48hEmail;

Reminder48hEmail.PreviewProps = {
  parentName: "Sam Taylor",
  eventName: "Studio Stars",
  eventDate: "2026-12-05",
  venue: "The Studio",
  venueAddress: "1 Example Street, London, N1 1AA",
  childNames: ["Ava", "Leo"],
} satisfies Reminder48hEmailProps;
