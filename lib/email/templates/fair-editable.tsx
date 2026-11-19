import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import { EmailButton } from "./components/email-button";
import { emailColors } from "./components/email-theme";
import { CtaWrap, Title, p } from "./shared";

/**
 * Layout for the admin-editable Christmas Fair emails. The words (heading,
 * body, button label) come from email_templates or the defaults; `details`
 * carries the automatic booking card (QR code, prices, deadlines).
 */
export function FairEditableEmail({
  previewText,
  heading,
  body,
  buttonLabel,
  buttonHref,
  details,
}: {
  previewText: string;
  heading: string;
  body: string;
  buttonLabel?: string | null;
  buttonHref?: string | null;
  details?: React.ReactNode;
}) {
  const paragraphs = body.split(/\n\s*\n/).map((para) => para.trim()).filter(Boolean);
  return (
    <EmailLayout previewText={previewText}>
      <Title>{heading}</Title>
      {paragraphs.map((para, i) => (
        <Text key={i} style={i === 0 && /^(hi|hello|dear)\b/i.test(para) ? { ...p, color: emailColors.night, fontWeight: 700 } : p}>
          {para.split("\n").map((line, j, lines) => (
            <React.Fragment key={j}>
              {line}
              {j < lines.length - 1 ? <br /> : null}
            </React.Fragment>
          ))}
        </Text>
      ))}
      {details}
      {buttonLabel && buttonHref ? (
        <CtaWrap>
          <EmailButton href={buttonHref} width={260}>{buttonLabel}</EmailButton>
        </CtaWrap>
      ) : null}
    </EmailLayout>
  );
}
