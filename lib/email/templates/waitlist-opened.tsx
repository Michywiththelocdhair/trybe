import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { formatEventDate } from "@/lib/dates";
import { Card, CtaWrap, DetailRow, Greeting, Title, getSiteUrl, p } from "./shared";

export type WaitlistOpenedEmailProps = {
  parentName: string;
  eventName: string;
  eventDate: string;
  spotsAvailable: number;
  siteUrl: string;
};

export function waitlistOpenedSubject(props: Pick<WaitlistOpenedEmailProps, "eventName">): string {
  return `A spot just opened! 🎉 ${props.eventName}`;
}

export function WaitlistOpenedEmail(props: WaitlistOpenedEmailProps) {
  const { parentName, eventName, eventDate, spotsAvailable, siteUrl } = props;
  const date = formatEventDate(eventDate);
  const spots = `${spotsAvailable} ${spotsAvailable === 1 ? "spot" : "spots"} available`;
  return (
    <EmailLayout previewText={`Good news — a spot has opened up for ${eventName}.`}>
      <Title>Great news!</Title>
      <Greeting name={parentName} />
      <Text style={p}>
        Great news — a spot has opened up for {eventName}, and you&apos;re first to know.
      </Text>

      <Card>
        <DetailRow label="Event" value={eventName} />
        <DetailRow label="Date" value={date} />
        <DetailRow label="Availability" value={spots} />
      </Card>

      <Text style={p}>
        Spots are limited and are given on a first come, first served basis, so we&apos;d recommend booking soon.
      </Text>

      <CtaWrap>
        <EmailButton href={`${getSiteUrl(siteUrl)}/studio-stars/book`}>Book now</EmailButton>
      </CtaWrap>
    </EmailLayout>
  );
}

export default WaitlistOpenedEmail;

WaitlistOpenedEmail.PreviewProps = {
  parentName: "Sam Taylor",
  eventName: "Studio Stars",
  eventDate: "2026-12-05",
  spotsAvailable: 2,
  siteUrl: "https://trybe.uk",
} satisfies WaitlistOpenedEmailProps;
