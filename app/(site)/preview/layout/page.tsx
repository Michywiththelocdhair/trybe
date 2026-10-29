import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Bento, BentoItem } from "@/components/layout/bento";

export const metadata: Metadata = {
  title: "Layout primitives preview",
  robots: { index: false, follow: false },
};

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

/** Small caps label. Inherits colour so it stays legible on every Section background. */
function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-extrabold uppercase tracking-[0.1em]">
      {children}
    </p>
  );
}

/** Placeholder bento tile (blush, 32px padding, card radius). */
function Tile({ children }: { children: ReactNode }) {
  return (
    <div className="h-full bg-blush p-8 rounded-card text-ink text-xl font-extrabold">
      {children}
    </div>
  );
}

export default function LayoutPreviewPage() {
  return (
    <>
      {/* Page heading. container={false} because the Container is placed by hand. */}
      <Section size="md" container={false}>
        <Container>
          <h1 className="display text-[56px] md:text-[88px] text-ink">
            Layout primitives preview
          </h1>
          <p className="text-ink-muted text-[19px] leading-7 max-w-xl mt-6">
            Container, Section and Bento. Resize the window to see the gutters
            (24px on mobile, 40px from md) and the 1440px cap.
          </p>
        </Container>
      </Section>

      {/* ── Container ───────────────────────────────────────── */}
      <Section size="md" container={false}>
        <Container>
          <Label>Container · max 1440px, gutters 24 / 40px</Label>
        </Container>
        {/* The dashed border is just for the preview, so the outer width and
            the gutter between border and text are visible. */}
        <Container className="mt-4 border border-dashed border-lavender">
          <p className="py-6 text-[19px] leading-7 text-ink">{LOREM}</p>
        </Container>
      </Section>

      {/* ── Section backgrounds ─────────────────────────────── */}
      <Section size="md" container={false}>
        <Container>
          <Label>Section · background variants</Label>
        </Container>
      </Section>

      <Section size="md">
        <Label>Default · no background · size md</Label>
        <p className="mt-2 max-w-xl text-[19px] leading-7">
          Inherits whatever sits behind it. Vertical padding 64px mobile, 80px
          desktop.
        </p>
      </Section>

      <Section size="lg" background="soft">
        <Label>Soft · bg-surface-soft (blush) · size lg</Label>
        <p className="mt-2 max-w-xl text-[19px] leading-7">
          Standard content section. 80px mobile, 112px desktop.
        </p>
      </Section>

      <Section size="lg" background="indigo">
        <Label>Indigo · bg-indigo, white text · size lg</Label>
        <p className="mt-2 max-w-xl text-[19px] leading-7">
          Full-width paint with the content held inside the Container.
        </p>
      </Section>

      {/* bg-night and bg-sunshine are Studio Stars tokens, only defined under
          data-theme="studio-stars". The real route layout supplies that; the
          preview has to opt in itself or both sections would render transparent. */}
      <div data-theme="studio-stars">
        <Section size="xl" background="night">
          <Label>Night · bg-night, white text · size xl</Label>
          <p className="mt-2 max-w-xl text-[19px] leading-7">
            Hero rhythm. 96px mobile, 128px desktop. Studio Stars only.
          </p>
        </Section>

        <Section size="lg" background="sunshine">
          <Label>Sunshine · bg-sunshine, night text · size lg</Label>
          <p className="mt-2 max-w-xl text-[19px] leading-7">
            Highlight band. Studio Stars only.
          </p>
        </Section>
      </div>

      {/* ── Bento ───────────────────────────────────────────── */}
      <Section size="lg">
        <Label>Bento · columns=3, gap=md (16px)</Label>
        <Bento columns={3} className="mt-4">
          <Tile>Tile 1</Tile>
          <Tile>Tile 2</Tile>
          <Tile>Tile 3</Tile>
          <Tile>Tile 4</Tile>
          <Tile>Tile 5</Tile>
          <Tile>Tile 6</Tile>
        </Bento>

        <div className="mt-16">
          <Label>Bento · columns=2 with a BentoItem span=2</Label>
          <Bento columns={2} className="mt-4">
            <BentoItem span={2}>
              <Tile>Spans both columns</Tile>
            </BentoItem>
            <BentoItem>
              <Tile>Span 1</Tile>
            </BentoItem>
            <BentoItem>
              <Tile>Span 1</Tile>
            </BentoItem>
          </Bento>
        </div>
      </Section>
    </>
  );
}
