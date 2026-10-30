import { ImageResponse } from "next/og";
import {
  BODY_FONT, DISPLAY_FONT, Domain, OG_COLORS as C, OG_CONTENT_TYPE, OG_SIZE,
  Star, frame, loadOgFonts,
} from "../../../lib/og";

export const alt = "Studio Stars - Christmas Singing Experience, Sat 5 Dec 2026 at The Qube";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <div style={frame(C.indigo)}>
        <Star x={50} y={30} size={64} color={C.sunshine} />
        <Star x={1040} y={70} size={64} color={C.blush} />
        <Star x={1010} y={400} size={120} color={C.orchid} opacity={0.9} />
        <Star x={120} y={420} size={50} color={C.orchid} />
        <Star x={900} y={40} size={32} color={C.sunshine} opacity={0.8} />
        <Star x={250} y={540} size={34} color={C.blush} opacity={0.7} />
        <div style={{ display: "flex", fontFamily: DISPLAY_FONT, fontSize: 168, fontWeight: 800, color: C.sunshine, lineHeight: 1 }}>
          Studio Stars
        </div>
        <div style={{ display: "flex", fontFamily: BODY_FONT, fontSize: 56, fontWeight: 600, color: "#ffffff", marginTop: 20 }}>
          Christmas Singing Experience
        </div>
        <div style={{ display: "flex", fontFamily: BODY_FONT, fontSize: 40, fontWeight: 600, color: C.orchid, marginTop: 28 }}>
          Sat 5 Dec 2026 · The Qube
        </div>
        <div style={{ display: "flex", fontFamily: BODY_FONT, fontSize: 38, fontWeight: 600, color: "#ffffff", marginTop: 12 }}>
          From £100 per child
        </div>
        <Domain bottom={28} />
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
