import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { Tag } from "@/components/tag";

export const metadata: Metadata = {
  title: "Buttons & tags preview",
  robots: { index: false, follow: false },
};

const row = "flex flex-wrap items-center gap-3";

/** A labelled specimen: small eyebrow above whatever is being shown. */
function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="eyebrow m-0">{label}</p>
      {children}
    </div>
  );
}

// The root layout already provides <main>, so this page renders a plain <div>.
export default function ButtonsTagsPreview() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 px-6 py-16 md:px-10">
      <h1 className="display m-0 text-[clamp(44px,9vw,92px)]">
        Buttons &amp; tags preview
      </h1>

      {/* ── Site-wide ─────────────────────────────────────────── */}
      <section aria-labelledby="site-wide-heading" className="flex flex-col gap-6">
        <h2
          id="site-wide-heading"
          className="display m-0 text-[clamp(32px,5vw,60px)]"
        >
          Site-wide
        </h2>

        <div className="flex flex-col gap-10 rounded-card border-[1.5px] border-border bg-white p-8">
          <Specimen label="Button · primary">
            <div className={row}>
              <Button>Primary button</Button>
              <Button as="a" href="#">
                Primary link
              </Button>
              <Button size="sm">Small</Button>
              <Button as="a" href="#" size="sm">
                Small link
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </Specimen>

          <Specimen label="Button · outline">
            <div className={row}>
              <Button variant="outline">Outline button</Button>
              <Button as="a" href="#" variant="outline">
                Outline link
              </Button>
              <Button variant="outline" size="sm">
                Small
              </Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </div>
          </Specimen>

          <Specimen label="Button · on-dark (tab to a button to see the doubled focus ring)">
            <div className="rounded-tile bg-indigo p-4">
              <div className={row}>
                <Button variant="on-dark">On-dark button</Button>
                <Button as="a" href="#" variant="on-dark">
                  On-dark link
                </Button>
                <Button variant="on-dark" size="sm">
                  Small
                </Button>
              </div>
            </div>
          </Specimen>

          <Specimen label="Tag · featured">
            <Tag variant="featured">Featured</Tag>
          </Specimen>

          <Specimen label="Tag · coming-soon">
            <Tag variant="coming-soon">Coming soon</Tag>
          </Specimen>

          <Specimen label="Tag · tbc">
            <Tag variant="tbc">[Placeholder — TBC]</Tag>
          </Specimen>
        </div>
      </section>

      {/* ── Studio Stars ──────────────────────────────────────── */}
      <section aria-labelledby="studio-stars-heading" className="flex flex-col gap-6">
        <h2
          id="studio-stars-heading"
          className="display m-0 text-[clamp(32px,5vw,60px)]"
        >
          Studio Stars
        </h2>

        <div
          data-theme="studio-stars"
          className="flex flex-col gap-10 rounded-card bg-night p-8 text-white"
        >
          <Specimen label="Button · studio-stars">
            <div className={row}>
              <Button variant="studio-stars">Studio Stars button</Button>
              <Button as="a" href="#" variant="studio-stars">
                Studio Stars link
              </Button>
              <Button variant="studio-stars" size="sm">
                Small
              </Button>
              <Button variant="studio-stars" disabled>
                Disabled
              </Button>
            </div>
          </Specimen>

          <Specimen label="Button · studio-stars-outline">
            <div className={row}>
              <Button variant="studio-stars-outline">Outline button</Button>
              <Button as="a" href="#" variant="studio-stars-outline">
                Outline link
              </Button>
              <Button variant="studio-stars-outline" size="sm">
                Small
              </Button>
              <Button variant="studio-stars-outline" disabled>
                Disabled
              </Button>
            </div>
          </Specimen>

          {/* The tag is night-on-night, so it sits on a cream panel to stay visible. */}
          <Specimen label="Tag · studio-stars">
            <div className="rounded-tile bg-cream p-4">
              <Tag variant="studio-stars">Studio Stars</Tag>
            </div>
          </Specimen>
        </div>
      </section>
    </div>
  );
}
