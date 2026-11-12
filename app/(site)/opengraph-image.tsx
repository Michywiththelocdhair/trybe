import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  BODY_FONT, OG_CONTENT_TYPE, OG_SIZE, Star, frame, loadOgFonts,
} from "../../lib/og";

export const alt = "Trybe - Fun experiences for families";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Homepage brand colours (app/tokens.css), not the Studio Stars palette. */
const BRAND = {
  white: "#ffffff",
  indigo: "#452c86",
  orchid: "#ba85ba",
  blush: "#f4e7f3",
} as const;

// public/images/logo.png is a 1244px square with the mark roughly in
// x 245-1000, y 345-840. Render it at LOGO_PX and crop to the mark.
const LOGO_PX = 1000;
const CROP = { left: 190, top: 270, width: 640, height: 420 } as const;

const logo = readFile(join(process.cwd(), "public/images/logo.png"));

export default async function Image() {
  const [fonts, logoBytes] = await Promise.all([loadOgFonts(), logo]);
  const logoSrc = `data:image/png;base64,${logoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={frame(BRAND.white)}>
        <Star x={90} y={70} size={80} color={BRAND.orchid} />
        <Star x={1030} y={80} size={56} color={BRAND.blush} />
        <Star x={150} y={420} size={44} color={BRAND.blush} />
        <Star x={990} y={370} size={96} color={BRAND.orchid} opacity={0.85} />
        <Star x={60} y={250} size={30} color={BRAND.indigo} opacity={0.25} />
        <Star x={1110} y={250} size={30} color={BRAND.indigo} opacity={0.25} />

        <div
          style={{
            display: "flex",
            width: CROP.width,
            height: CROP.height,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <img
            src={logoSrc}
            width={LOGO_PX}
            height={LOGO_PX}
            alt=""
            style={{ position: "absolute", left: -CROP.left, top: -CROP.top }}
          />
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: BODY_FONT,
            fontSize: 50,
            fontWeight: 600,
            color: BRAND.indigo,
            marginTop: 8,
          }}
        >
          Fun experiences for families
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 18,
            display: "flex",
            background: BRAND.indigo,
          }}
        />
      </div>
    ),
    { ...size, fonts },
  );
}
