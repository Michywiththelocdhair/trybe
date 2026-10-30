import * as React from "react";
import { Hr, Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { emailColors, emailFonts } from "./components/email-theme";
import { formatEventDate } from "@/lib/dates";
import { formatGbp } from "@/lib/booking/pricing";
import { Card, DetailRow, Greeting, LILAC_BORDER, Title, p } from "./shared";

export type ReceiptEmailProps = {
  parentName: string;
  parentEmail: string;
  eventName: string;
  eventDate: string;
  venue: string;
  children: { firstName: string; position: number }[];
  firstTicketPence: number;
  siblingTicketPence: number;
  totalPence: number;
  bookingRef: string;
  confirmedAt: string;
};

export function receiptSubject(props: Pick<ReceiptEmailProps, "eventName">): string {
  return `Payment receipt — ${props.eventName}`;
}

function formatPurchaseDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatEventDate(d.toISOString().slice(0, 10));
}

const cell = (align: "left" | "right", bold = false): React.CSSProperties => ({
  padding: "10px 0",
  textAlign: align,
  fontFamily: emailFonts.body,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: bold ? 700 : 400,
  color: emailColors.night,
  borderBottom: `1px solid ${LILAC_BORDER}`,
});

export function ReceiptEmail(props: ReceiptEmailProps) {
  const { parentName, parentEmail, eventName, eventDate, venue, children, firstTicketPence, siblingTicketPence, totalPence, bookingRef, confirmedAt } = props;
  const siblings = Math.max(children.length - 1, 0);
  const total = formatGbp(totalPence);

  return (
    <EmailLayout previewText={`Your receipt for ${eventName} — ${total}.`}>
      <Title>Payment receipt</Title>
      <Greeting name={parentName} />
      <Text style={p}>Thanks for your booking. Here&apos;s your receipt.</Text>

      <Card>
        <DetailRow label="Booking reference" value={bookingRef.slice(0, 8).toUpperCase()} />
        <DetailRow label="Date of purchase" value={formatPurchaseDate(confirmedAt)} />
        <DetailRow label="Billed to" value={`${parentName} (${parentEmail})`} />
        <DetailRow label="Event" value={`${eventName} · ${formatEventDate(eventDate)}`} />
        <DetailRow label="Venue" value={venue} />

        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={cell("left")}>First child</td>
              <td style={cell("right")}>{formatGbp(firstTicketPence)}</td>
            </tr>
            {siblings > 0 && (
              <tr>
                <td style={cell("left")}>
                  Sibling × {siblings}
                </td>
                <td style={cell("right")}>{formatGbp(siblingTicketPence)} each</td>
              </tr>
            )}
            <tr>
              <td style={{ ...cell("left", true), borderBottom: "none", paddingTop: "14px" }}>Total</td>
              <td style={{ ...cell("right", true), borderBottom: "none", paddingTop: "14px", color: emailColors.purple }}>
                {total}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Text style={p}>This serves as your receipt for the payment of {total}.</Text>
      <Hr style={{ borderColor: LILAC_BORDER, margin: "8px 0 16px" }} />
      <Text style={{ ...p, fontSize: "13px", textAlign: "center" }}>Trybe · London, UK</Text>
    </EmailLayout>
  );
}

export default ReceiptEmail;

ReceiptEmail.PreviewProps = {
  parentName: "Sam Taylor",
  parentEmail: "sam@example.com",
  eventName: "Studio Stars",
  eventDate: "2026-12-05",
  venue: "The Studio, London",
  children: [{ firstName: "Ava", position: 1 }, { firstName: "Leo", position: 2 }],
  firstTicketPence: 10000,
  siblingTicketPence: 8000,
  totalPence: 18000,
  bookingRef: "3f9a1c2e-0000-4000-8000-000000000000",
  confirmedAt: "2026-10-30T10:00:00Z",
} satisfies ReceiptEmailProps;
