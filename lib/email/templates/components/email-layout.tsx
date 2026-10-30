import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { EmailFooter } from "./email-footer";
import { emailColors, emailFonts } from "./email-theme";

export function EmailLayout({
  previewText,
  children,
  unsubscribeHref,
}: {
  previewText: string;
  children: React.ReactNode;
  unsubscribeHref?: string;
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{`@media only screen and (max-width:620px){.trybe-body{padding:24px 20px !important}}`}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: emailColors.night,
          fontFamily: emailFonts.body,
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: emailColors.cream,
          }}
        >
          <Section
            style={{
              backgroundColor: emailColors.night,
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontFamily: emailFonts.display,
                fontSize: "32px",
                lineHeight: "36px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: emailColors.sunshine,
              }}
            >
              Trybe
            </Text>
          </Section>
          <Section className="trybe-body" style={{ padding: "32px 32px 16px" }}>
            {children}
          </Section>
          <EmailFooter unsubscribeHref={unsubscribeHref} />
        </Container>
      </Body>
    </Html>
  );
}
