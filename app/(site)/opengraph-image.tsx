import { ImageResponse } from "next/og";
import {
  BODY_FONT, DISPLAY_FONT, Domain, OG_COLORS as C, OG_CONTENT_TYPE, OG_SIZE,
  Star, frame, loadOgFonts,
} from "../../lib/og";

export const alt = "Trybe - Fun experiences for families";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <div style={frame(C.night)}>
        <Star x={90} y={70} size={90} color={C.orchid} />
        <Star x={1020} y={90} size={60} color={C.blush} />
        <Star x={170} y={400} size={46} color={C.blush} opacity={0.8} />
        <Star x={980} y={380} size={110} color={C.orchid} opacity={0.9} />
        <Star x={560} y={30} size={34} color={C.blush} opacity={0.7} />
        <Star x={1100} y={500} size={36} color={C.blush} opacity={0.7} />
        <Star x={60} y={520} size={40} color={C.orchid} opacity={0.7} />
        <div style={{ display: "flex", fontFamily: DISPLAY_FONT, fontSize: 220, fontWeight: 800, color: C.sunshine, lineHeight: 1 }}>
          Trybe
        </div>
        <div style={{ display: "flex", fontFamily: BODY_FONT, fontSize: 52, fontWeight: 600, color: "#ffffff", marginTop: 24 }}>
          Fun experiences for families
        </div>
        <Domain />
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
