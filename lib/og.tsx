import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties, ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  night: "#24123f",
  sunshine: "#ffd447",
  orchid: "#ba85ba",
  cream: "#fff6cf",
  blush: "#f4e7f3",
  indigo: "#2d1854",
  purple: "#62358c",
} as const;

// Satori cannot parse woff2, so static TTF instances (generated from the
// @fontsource-variable files) live in assets/fonts.
const display = readFile(
  join(process.cwd(), "assets/fonts/BricolageGrotesque-ExtraBold.ttf"),
);
const body = readFile(
  join(process.cwd(), "assets/fonts/Catamaran-SemiBold.ttf"),
);

export async function loadOgFonts() {
  const [d, b] = await Promise.all([display, body]);
  return [
    { name: "Bricolage Grotesque", data: d, weight: 800 as const, style: "normal" as const },
    { name: "Catamaran", data: b, weight: 600 as const, style: "normal" as const },
  ];
}

export const DISPLAY_FONT = "Bricolage Grotesque";
export const BODY_FONT = "Catamaran";

/** 4-pointed star, absolutely positioned. */
export function Star({
  x,
  y,
  size,
  color,
  opacity = 1,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity?: number;
}): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
      <path d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z" fill={color} />
    </svg>
  );
}

export const frame = (background: string): CSSProperties => ({
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  background,
});

export function Domain({ bottom = 40 }: { bottom?: number }): ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        fontFamily: BODY_FONT,
        fontSize: 32,
        color: OG_COLORS.orchid,
        letterSpacing: 1,
      }}
    >
      trybe.uk
    </div>
  );
}
