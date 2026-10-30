import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { Card, CtaWrap, DetailRow, Title, getSiteUrl, h2, p } from "./shared";

export type WelcomeEmailProps = { email: string };

export function welcomeSubject(): string {
  return "Welcome to the Trybe! 💛";
}

export function WelcomeEmail(_props: WelcomeEmailProps) {
  return (
    <EmailLayout previewText="You'll be the first to hear about upcoming events for your little ones.">
      <Title>Welcome to the Trybe!</Title>
      <Text style={p}>
        Thanks for joining the Trybe family! You&apos;ll be the first to hear about upcoming
        events, experiences and activities for your little ones.
      </Text>

      <Text style={h2}>Here&apos;s what&apos;s on next:</Text>
      <Card>
        <DetailRow label="Event" value="Studio Stars" />
        <DetailRow label="Date" value="Sat 5 Dec 2026" />
        <DetailRow label="Price" value="From £100" />
      </Card>

      <CtaWrap>
        <EmailButton href={`${getSiteUrl()}/studio-stars`}>Explore Studio Stars</EmailButton>
      </CtaWrap>

      <Text style={p}>See you soon!</Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;

WelcomeEmail.PreviewProps = {
  email: "sam@example.com",
} satisfies WelcomeEmailProps;
