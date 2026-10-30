import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { Card, CtaWrap, DetailRow, Greeting, Title, joinNames, p } from "./shared";

export type DayOfEmailProps = {
  parentName: string;
  eventName: string;
  venue: string;
  venueAddress: string;
  childNames: string[];
};

export function dayOfSubject(props: Pick<DayOfEmailProps, "eventName">): string {
  return `Today's the day! 🌟 ${props.eventName}`;
}

export function DayOfEmail(props: DayOfEmailProps) {
  const { parentName, eventName, venue, venueAddress, childNames } = props;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue}, ${venueAddress}`,
  )}`;
  return (
    <EmailLayout previewText={`${eventName} is today — here's where to be.`}>
      <Title>The day is here!</Title>
      <Greeting name={parentName} />
      <Text style={p}>
        {eventName} is today. Please aim to arrive 10 minutes early so there&apos;s time to settle in.
      </Text>

      <Card>
        <DetailRow label="Venue" value={venue} />
        <DetailRow label="Address" value={venueAddress} />
      </Card>

      <Text style={p}>
        We can&apos;t wait to see {childNames.length ? joinNames(childNames) : "you all"}!
      </Text>

      <CtaWrap>
        <EmailButton href={mapsHref}>Get directions</EmailButton>
      </CtaWrap>
    </EmailLayout>
  );
}

export default DayOfEmail;

DayOfEmail.PreviewProps = {
  parentName: "Sam Taylor",
  eventName: "Studio Stars",
  venue: "The Studio",
  venueAddress: "1 Example Street, London, N1 1AA",
  childNames: ["Ava", "Leo"],
} satisfies DayOfEmailProps;
