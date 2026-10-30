import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { CtaWrap, Greeting, Title, h2, joinNames, p } from "./shared";

export type ThankYouEmailProps = {
  parentName: string;
  eventName: string;
  childNames: string[];
  reviewUrl?: string;
};

export function thankYouSubject(_props?: Partial<ThankYouEmailProps>): string {
  return "Thank you from Trybe! 💛";
}

export function ThankYouEmail(props: ThankYouEmailProps) {
  const { parentName, eventName, childNames, reviewUrl = "#review" } = props;
  return (
    <EmailLayout previewText={`Thank you for being part of ${eventName}.`}>
      <Title>What a day!</Title>
      <Greeting name={parentName} />
      <Text style={p}>
        Thank you so much for joining us at {eventName}.{" "}
        {childNames.length ? `${joinNames(childNames)} were` : "The kids were"} absolutely amazing — so much
        confidence, energy and joy. It was a pleasure to have them.
      </Text>

      <Text style={h2}>Help other families discover Trybe</Text>
      <Text style={p}>
        If you enjoyed the day, a quick review makes a huge difference to a small team like ours.
      </Text>

      <CtaWrap>
        <EmailButton href={reviewUrl}>Leave a review</EmailButton>
      </CtaWrap>

      <Text style={p}>
        Got photos or videos from the day? Share them and tag us — we love seeing your Trybe moments.
      </Text>
      <Text style={p}>See you at the next one!</Text>
    </EmailLayout>
  );
}

export default ThankYouEmail;

ThankYouEmail.PreviewProps = {
  parentName: "Sam Taylor",
  eventName: "Studio Stars",
  childNames: ["Ava", "Leo"],
} satisfies ThankYouEmailProps;
