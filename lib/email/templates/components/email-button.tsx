import * as React from "react";
import { emailColors, emailFonts } from "./email-theme";

/**
 * Bulletproof pill button. Outlook (Word engine) gets a VML roundrect via
 * conditional comments; everything else gets a padded anchor.
 */
export function EmailButton({
  href,
  children,
  background = emailColors.sunshine,
  color = emailColors.night,
  width = 220,
  height = 48,
}: {
  href: string;
  children: React.ReactNode;
  background?: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  const label = typeof children === "string" ? children : "";
  const vml = `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(
    href,
  )}" style="height:${height}px;v-text-anchor:middle;width:${width}px;" arcsize="50%" stroke="f" fillcolor="${background}">
<w:anchorlock/>
<center style="color:${color};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${escapeHtml(
    label,
  )}</center>
</v:roundrect>
<![endif]-->`;

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ margin: "0 auto" }}
    >
      <tbody>
        <tr>
          <td align="center">
            <div dangerouslySetInnerHTML={{ __html: vml }} />
            {/* Hidden from Outlook, shown everywhere else. */}
            <div
              dangerouslySetInnerHTML={{
                __html: `<!--[if !mso]><!-->`,
              }}
            />
            <a
              href={href}
              target="_blank"
              style={{
                display: "inline-block",
                backgroundColor: background,
                color,
                fontFamily: emailFonts.display,
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: `${height}px`,
                minWidth: `${width}px`,
                padding: "0 28px",
                borderRadius: "999px",
                textAlign: "center",
                textDecoration: "none",
                msoHide: "all",
              } as React.CSSProperties}
            >
              {children}
            </a>
            <div dangerouslySetInnerHTML={{ __html: `<!--<![endif]-->` }} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
