import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { emailColors, emailFonts } from "./components/email-theme";

export const LILAC_BORDER = "#e4d8f0";

export function getSiteUrl(override?: string): string {
  const url =
    override ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://trybe.uk";
  return url.replace(/\/+$/, "");
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

export function joinNames(names: string[]): string {
  return names.filter(Boolean).join(" & ");
}

export const h1: React.CSSProperties = {
  margin: "0 0 16px",
  fontFamily: emailFonts.display,
  fontSize: "36px",
  lineHeight: "40px",
  fontWeight: 800,
  letterSpacing: "-0.5px",
  color: emailColors.night,
};

export const h2: React.CSSProperties = {
  margin: "28px 0 12px",
  fontFamily: emailFonts.display,
  fontSize: "20px",
  lineHeight: "26px",
  fontWeight: 700,
  color: emailColors.night,
};

export const p: React.CSSProperties = {
  margin: "0 0 16px",
  fontFamily: emailFonts.body,
  fontSize: "16px",
  lineHeight: "26px",
  color: emailColors.mutedPlum,
};

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Heading as="h1" style={h1}>
      {children}
    </Heading>
  );
}

export function Greeting({ name }: { name: string }) {
  return (
    <Text style={{ ...p, color: emailColors.night, fontWeight: 700 }}>
      Hi {firstName(name)},
    </Text>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: emailColors.white,
        border: `1px solid ${LILAC_BORDER}`,
        borderRadius: "16px",
        padding: "20px 22px",
        margin: "8px 0 24px",
      }}
    >
      {children}
    </Section>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <Text
        style={{
          margin: "0",
          fontFamily: emailFonts.body,
          fontSize: "12px",
          lineHeight: "16px",
          fontWeight: 700,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: emailColors.purple,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          margin: "2px 0 14px",
          fontFamily: emailFonts.body,
          fontSize: "16px",
          lineHeight: "24px",
          color: emailColors.night,
        }}
      >
        {value}
      </Text>
    </>
  );
}

export function CtaWrap({ children }: { children: React.ReactNode }) {
  return <Section style={{ padding: "8px 0 24px", textAlign: "center" }}>{children}</Section>;
}
