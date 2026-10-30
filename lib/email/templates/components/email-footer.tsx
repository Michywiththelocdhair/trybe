import * as React from "react";
import { Hr, Link, Section, Text } from "@react-email/components";
import { emailColors, emailFonts } from "./email-theme";

export function EmailFooter({
  unsubscribeHref = "#unsubscribe",
}: {
  unsubscribeHref?: string;
}) {
  const text: React.CSSProperties = {
    margin: "0 0 6px",
    fontFamily: emailFonts.body,
    fontSize: "12px",
    lineHeight: "18px",
    color: emailColors.mutedPlum,
    textAlign: "center",
  };
  return (
    <Section style={{ padding: "8px 24px 28px" }}>
      <Hr style={{ borderColor: emailColors.blush, margin: "0 0 20px" }} />
      <Text style={{ ...text, fontWeight: 700 }}>Trybe · London, UK</Text>
      <Text style={text}>
        You&apos;re receiving this because you booked a Trybe event.
      </Text>
      <Text style={text}>
        <Link
          href={unsubscribeHref}
          style={{ color: emailColors.mutedPlum, textDecoration: "underline" }}
        >
          Unsubscribe
        </Link>
      </Text>
    </Section>
  );
}
