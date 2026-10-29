import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio Stars",
  description:
    "A festive performance showcase for kids. Book a slot and shine bright.",
};

export default function StudioStarsPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16 md:py-24">
      <p className="eyebrow" style={{ color: "var(--sunshine)" }}>
        Studio Stars · scaffold
      </p>
      <h1 className="display text-[72px] md:text-[112px] mt-2">
        Shine bright
      </h1>
      <p className="text-[#E4D8F0] text-[19px] leading-7 max-w-xl mt-6">
        Palette is live on this route — sunshine yellow and night. Phase 2 will
        build this out to match the Studio Stars desktop and mobile artboards.
      </p>
    </div>
  );
}
