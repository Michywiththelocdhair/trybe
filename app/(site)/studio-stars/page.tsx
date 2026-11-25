import type { Metadata } from "next";
import { Button } from "@/components/button";
import { Container } from "@/components/layout/container";

/**
 * Holding page while Studio Stars is between runs.
 *
 * The full event page from the 5 Dec 2026 run is kept, commented out, in
 * ./_previous-page.tsx so it can be restored for the next dates.
 */

export const metadata: Metadata = {
  title: "Studio Stars — a singing experience for kids",
  description:
    "Studio Stars gives every child their own session in the spotlight, singing a song they love in a real studio. New dates coming soon.",
  // openGraph is shallow-merged with the root layout, so siteName and locale
  // are repeated here to keep them.
  openGraph: {
    title: "Studio Stars — a singing experience for kids",
    description:
      "Every child gets their own moment in the spotlight. New dates coming soon.",
    type: "website",
    siteName: "Trybe",
    locale: "en_GB",
  },
};

const STAR_PATH =
  "M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z";

function Star({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

const MUTED = "text-[color:var(--muted-plum)]";

export default function StudioStarsPage() {
  return (
    <div className="bg-white text-night">
      <Container className="pb-16 pt-6 md:pb-28 md:pt-14">
        <section
          aria-labelledby="ss-title"
          className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12"
        >
          <div className="flex min-w-0 flex-col items-start gap-5 md:gap-6 lg:flex-1">
            <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-trybe-purple md:text-sm">
              Studio Stars
            </p>
            <h1
              id="ss-title"
              className="display text-[44px] tracking-[-0.01em] text-balance md:text-[length:clamp(54px,6.6vw,104px)]"
            >
              Let your little star{" "}
              <span className="rounded-xl bg-sunshine px-[0.12em] text-night box-decoration-clone md:rounded-2xl">
                shine
              </span>
            </h1>
            <p className={`max-w-[540px] text-lg leading-normal md:text-[21px] ${MUTED}`}>
              Studio Stars is a singing experience where every child gets their
              very own moment in the spotlight. They step into a real studio,
              pop on the headphones and sing a song they&apos;ve chosen, in a
              dedicated session that&apos;s all about them.
            </p>

            <div className="flex w-full max-w-[540px] items-start gap-4 rounded-card bg-night p-5 text-white md:p-7">
              <Star className="mt-1 size-7 shrink-0 text-sunshine md:size-8" />
              <div className="flex flex-col gap-1">
                <strong className="text-xl md:text-2xl">
                  New dates coming soon
                </strong>
                <span className="text-base leading-normal text-[color:var(--border-lilac)] md:text-lg">
                  We&apos;ll be announcing the next Studio Stars dates soon.
                </span>
              </div>
            </div>

            <Button
              as="a"
              href="/#events"
              variant="studio-stars-outline-light"
            >
              See what&apos;s on
            </Button>
          </div>

          <div className="relative flex justify-center lg:min-w-0 lg:flex-1">
            <div
              role="img"
              aria-label="A child singing into a microphone in the studio"
              className="aspect-[4/5] w-full max-w-[460px] rounded-[22px] bg-trybe-purple bg-cover bg-center md:rounded-block"
              style={{ backgroundImage: 'url("/images/studio-stars-1.jpg")' }}
            />
            <Star className="absolute -top-3 left-[6%] size-10 text-sunshine md:size-14" />
            <Star className="absolute bottom-[8%] right-[4%] size-7 text-orchid md:size-9" />
          </div>
        </section>
      </Container>
    </div>
  );
}
