import { ImageResponse } from "next/og";
import {
  BODY_FONT, DISPLAY_FONT, Domain, OG_COLORS as C, OG_CONTENT_TYPE, OG_SIZE,
  Star, frame, loadOgFonts,
} from "../../../../lib/og";

export const alt = "Book Studio Stars - Reserve your child's Christmas spotlight";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <div style={frame(C.purple)}>
        <Star x={50} y={50} size={64} color={C.sunshine} />
        <Star x={1040} y={100} size={56} color={C.blush} />
        <Star x={990} y={400} size={110} color={C.orchid} />
        <Star x={150} y={430} size={46} color={C.blush} opacity={0.8} />
        <div style={{ display: "flex", fontFamily: DISPLAY_FONT, fontSize: 116, fontWeight: 800, color: C.sunshine, lineHeight: 1 }}>
          Book Studio Stars
        </div>
        <div style={{ display: "flex", fontFamily: BODY_FONT, fontSize: 48, fontWeight: 600, color: "#ffffff", marginTop: 28 }}>
          Reserve your child&apos;s Christmas spotlight
        </div>
        <Domain />
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
