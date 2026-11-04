import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
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
          backgroundColor: emailColors.cream,
          fontFamily: emailFonts.body,
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: emailColors.white,
            border: `1px solid ${emailColors.blush}`,
          }}
        >
          <Section
            style={{
              backgroundColor: emailColors.white,
              borderBottom: `3px solid ${emailColors.blush}`,
              padding: "12px 24px",
              textAlign: "center",
            }}
          >
            <Img
              src={`${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://trybe.uk").replace(/\/+$/, "")}/images/logo.png`}
              alt="Trybe"
              width="100"
              height="100"
              style={{
                display: "block",
                width: "100px",
                height: "100px",
                margin: "0 auto",
                objectFit: "contain",
              }}
            />
          </Section>
          <Section className="trybe-body" style={{ padding: "28px 32px 16px" }}>
            {children}
          </Section>
          <EmailFooter unsubscribeHref={unsubscribeHref} />
        </Container>
      </Body>
    </Html>
  );
}
