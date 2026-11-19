import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { Card, Title, getSiteUrl, p } from "./shared";

/**
 * Internal notice to the Trybe inbox about fair activity. The customer-facing
 * fair emails are admin-editable: see lib/christmas-fair/emails.tsx.
 */
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
