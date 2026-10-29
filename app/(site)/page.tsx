import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { LinkCard } from "@/components/link-card";
import { Tag } from "@/components/tag";
import { Bento } from "@/components/layout/bento";
import { Section } from "@/components/layout/section";

/**
 * Vertical rhythm between bands. Section's own padding (64/80 or more per side)
 * would double up to far more than the design's 72px (mobile) / 120px (desktop)
 * gap, so each band overrides it with important utilities: 36 + 36 and 60 + 60.
 * scroll-mt clears the sticky header for the #events / #nyah / #about anchors.
 */
const BAND = "scroll-mt-24 py-9! md:py-15!";

/** .display is unlayered CSS (line-height 0.92), so 0.95 headings need an inline style. */
const TIGHT = { lineHeight: 0.95 } as const;

const STAR_PATH =
  "M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z";

/** Four-point orchid star — the decorative brand mark. Colour it with text-*. */
function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function StrokeIcon({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

/**
 * Placeholder photo with a solid fallback colour (pass a bg-* class) so the
 * layout holds if the image fails to load. The optional chip is decorative.
 */
function Photo({
  src,
  alt,
  chip,
  loading = "lazy",
  className = "",
}: {
  src: string;
  alt: string;
  chip?: string;
  loading?: "lazy" | "eager";
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* PLACEHOLDER PHOTO — user to replace */}
      {/* eslint-disable-next-line @next/next/no-img-element -- placeholder photos come from picsum.photos */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className="absolute inset-0 size-full object-cover"
      />
      {chip ? (
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl bg-indigo/85 px-3 py-1.5 text-[15px] font-semibold text-white md:bottom-6 md:left-6"
        >
          <StrokeIcon className="size-4">
            <path d="M3 7h4l2-3h6l2 3h4v13H3z" />
            <circle cx="12" cy="13" r="4" />
          </StrokeIcon>
          {chip}
        </span>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ───────────── 1. Hero ───────────── */}
      <Section
        aria-labelledby="hero-title"
        className="pt-3! pb-9! md:pt-6! md:pb-15!"
      >
        <div className="grid gap-3 md:gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-card bg-indigo px-6 py-7 text-white md:min-h-[520px] md:gap-10 md:rounded-[36px] md:p-14 lg:min-h-[600px] lg:p-16">
            <Star className="absolute right-[22px] top-[22px] size-10 text-orchid md:right-12 md:top-11 md:size-16" />
            <Star className="absolute right-32 top-28 hidden size-[26px] text-blush md:block" />

            <div className="flex flex-col items-start gap-5 md:gap-6">
              <p className="rounded-pill border-[1.5px] border-white/50 px-3 py-1 text-[13px] font-bold uppercase tracking-[0.08em]">
                Events · Experiences
              </p>
              <h1
                id="hero-title"
                className="display text-balance text-[44px] tracking-[-0.01em] md:text-[72px] lg:text-[64px] xl:text-[88px]"
              >
                Making memories, one{" "}
                <span className="text-orchid">family adventure</span> at a time
              </h1>
              <p className="max-w-[540px] text-lg leading-normal text-blush md:text-[21px]">
                Discover fun-filled experiences, activities and events that
                bring children and families together.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap md:gap-3">
              <Button
                as="a"
                href="#events"
                variant="on-dark"
                className="w-full gap-2.5 sm:w-auto"
              >
                Explore Upcoming Events
                <ArrowRight className="hidden md:block" />
              </Button>
              {/* The "studio-stars-outline" variant is just a white 2px outline; it reads fine on indigo. */}
              <Button
                as="a"
                href="#about"
                variant="studio-stars-outline"
                className="w-full focus-visible:outline-white sm:w-auto"
              >
                Discover Trybe
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col lg:gap-4">
            <Photo
              src="https://picsum.photos/seed/family-candid/800/600"
              alt="A parent and child laughing together at a Trybe event"
              loading="eager"
              className="h-[170px] rounded-[24px] bg-lavender md:h-[240px] lg:h-auto lg:min-h-[340px] lg:flex-1 lg:rounded-[36px]"
            />

            <Link
              href="/studio-stars"
              className="relative flex h-[170px] flex-col justify-between overflow-hidden rounded-[24px] bg-trybe-purple p-[18px] text-white no-underline transition-transform hover:-translate-y-1 md:h-[240px] md:p-6 lg:h-auto lg:justify-start lg:gap-3 lg:rounded-[36px] lg:p-7"
            >
              <Star className="absolute right-6 top-6 hidden size-[34px] text-orchid lg:block" />
              <span className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-blush lg:text-sm">
                Next up
              </span>
              <span
                className="display text-[32px] lg:text-[44px]"
                style={TIGHT}
              >
                Studio Stars
              </span>
              <span className="text-[15px] leading-[1.45] text-blush lg:text-[17px]">
                <span className="lg:hidden">Sat 5 Dec · The Qube</span>
                <span className="hidden lg:inline">
                  A Christmas singing experience · Sat 5 Dec 2026 · The Qube
                </span>
              </span>
              <span className="hidden items-center gap-2 text-[17px] font-extrabold lg:inline-flex">
                Discover Studio Stars
                <ArrowRight className="size-4" />
              </span>
            </Link>
          </div>
        </div>
      </Section>

      {/* ───────────── 2. Upcoming events ───────────── */}
      <Section id="events" aria-labelledby="events-title" className={BAND}>
        <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between md:gap-4">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <p className="eyebrow">What&apos;s on</p>
            <h2
              id="events-title"
              className="display text-[48px] tracking-[-0.01em] md:text-[60px] lg:text-[76px]"
              style={TIGHT}
            >
              Upcoming events
            </h2>
          </div>
          <p className="hidden max-w-[420px] text-[19px] leading-normal text-ink-muted md:block">
            Pick an event, see exactly what&apos;s involved, and book your
            child&apos;s place in a few taps.
          </p>
        </div>

        {/*
          Both event cards are inlined instead of using <EventCard>:
          - EventCard only takes a one-line `metadata` string, but the Studio Stars
            card needs a 2x2 grid of facts (date, venue, format, pricing) plus two CTAs.
          - The Christmas Fair card needs real <Tag variant="tbc"> placeholders, which
            a string prop can't carry, and a "Coming soon" tag variant it doesn't have.
          The shell classes match EventCard so the two stay visually consistent.
        */}
        <div className="mt-[18px] grid gap-3 md:mt-8 md:gap-4 lg:grid-cols-[2fr_1fr]">
          {/* Featured: Studio Stars */}
          <article className="flex flex-col overflow-hidden rounded-card border-[1.5px] border-border bg-surface text-ink md:rounded-[36px] lg:flex-row">
            <div className="relative flex h-[210px] items-center justify-center overflow-hidden bg-indigo md:h-[300px] lg:h-auto lg:min-h-[380px] lg:w-[38%] lg:shrink-0">
              <div
                aria-hidden="true"
                className="absolute -top-10 left-1/2 h-[300px] w-[260px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(186,133,186,0.55),rgba(186,133,186,0)_70%)] md:h-[420px] md:w-[340px]"
              />
              {/* Artwork stays as the design's mic-and-stars illustration until real event art exists. */}
              <div
                role="img"
                aria-label="Studio Stars artwork: a microphone under a starry stage light"
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 48 72"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative h-[108px] w-[72px] text-white md:h-[180px] md:w-[120px]"
                >
                  <rect x="14" y="4" width="20" height="32" rx="10" />
                  <path d="M14 18h20M14 25h20" />
                  <path d="M8 30c0 9 7 16 16 16s16-7 16-16" />
                  <path d="M24 46v16M14 66h20" />
                </svg>
                <Star className="absolute left-[30px] top-[70px] size-7 text-orchid md:left-9 md:top-16 md:size-10" />
                <Star className="absolute right-10 top-[100px] size-[18px] text-blush md:right-11 md:top-[90px] md:size-[22px]" />
                <Star className="absolute bottom-[54px] right-16 hidden size-7 text-lavender md:block" />
              </div>
              <Tag
                variant="featured"
                className="absolute left-4 top-4 md:left-5 md:top-5"
              >
                Featured
              </Tag>
            </div>

            <div className="flex flex-col gap-[14px] p-[22px] md:gap-[22px] md:p-9 lg:flex-1">
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Christmas singing experience</p>
                <h3
                  className="display text-[42px] md:text-[52px]"
                  style={TIGHT}
                >
                  Studio Stars
                </h3>
                <p className="text-[17px] leading-normal text-ink-muted md:text-lg md:leading-[1.55]">
                  Your child&apos;s very own 20-minute session in the spotlight,
                  singing a Christmas song they choose.
                </p>
              </div>

              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 text-base leading-[1.3] md:gap-[14px] md:text-[17px]">
                <li className="flex items-start gap-2.5">
                  <StrokeIcon className="mt-px hidden size-5 shrink-0 text-trybe-purple xl:block">
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </StrokeIcon>
                  <span>
                    <strong>Sat 5 Dec 2026</strong>
                    <br />
                    From 9:00 am
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <StrokeIcon className="mt-px hidden size-5 shrink-0 text-trybe-purple xl:block">
                    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </StrokeIcon>
                  <span>
                    <strong>The Qube</strong>
                    <br />
                    Parking available
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <StrokeIcon className="mt-px hidden size-5 shrink-0 text-trybe-purple xl:block">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </StrokeIcon>
                  <span>
                    <strong>20-minute session</strong>
                    <br />
                    One per child
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <StrokeIcon className="mt-px hidden size-5 shrink-0 text-trybe-purple xl:block">
                    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
                    <circle cx="7.5" cy="7.5" r="1.5" />
                  </StrokeIcon>
                  <span>
                    <strong>£100 per child</strong>
                    <br />
                    20% off each extra sibling
                  </span>
                </li>
              </ul>

              <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button as="a" href="/studio-stars" className="w-full sm:w-auto">
                  Discover Studio Stars
                </Button>
                <Button
                  as="a"
                  href="/studio-stars/book"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Book a slot
                </Button>
              </div>
            </div>
          </article>

          {/* Coming soon: Christmas Fair */}
          <article className="flex flex-col overflow-hidden rounded-card border-[1.5px] border-border bg-surface text-ink md:rounded-[36px]">
            <div className="relative flex h-[150px] items-center justify-center bg-periwinkle md:h-60">
              <div
                role="img"
                aria-label="Placeholder artwork for the Trybe Christmas Fair"
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden size-24 text-white md:block"
                >
                  <path d="M6 20h36l-4-10H10z" />
                  <path d="M10 20v22h28V20" />
                  <path d="M20 42V30h8v12" />
                  <path d="M6 20c0 3 2 5 4.5 5S15 23 15 20c0 3 2 5 4.5 5S24 23 24 20c0 3 2 5 4.5 5S33 23 33 20c0 3 2 5 4.5 5S42 23 42 20" />
                </svg>
              </div>
              <Tag
                variant="coming-soon"
                className="absolute left-4 top-4 md:left-5 md:top-5"
              >
                Coming soon
              </Tag>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-[22px] md:gap-[14px] md:p-8">
              <p className="eyebrow">Family event</p>
              <h3
                className="display text-[38px] md:text-[44px]"
                style={TIGHT}
              >
                Christmas Fair
              </h3>
              <p className="text-[17px] leading-normal text-ink-muted md:text-lg md:leading-[1.55]">
                A festive Trybe day out for the whole family. Full details are
                on their way.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-base">
                <li>
                  Date: <Tag variant="tbc">[Date TBC]</Tag>
                </li>
                <li>
                  Location: <Tag variant="tbc">[Venue TBC]</Tag>
                </li>
                <li>
                  Price: <Tag variant="tbc">[Price TBC]</Tag>
                </li>
              </ul>
              {/* [REPLACE: link to the Christmas Fair page once its details are confirmed] */}
              <Button
                as="a"
                href="#events"
                variant="outline"
                className="mt-auto w-full md:w-auto md:self-start"
              >
                Find out more
              </Button>
            </div>
          </article>
        </div>
      </Section>

      {/* ───────────── 3. Meet Nyah ───────────── */}
      <Section id="nyah" aria-labelledby="nyah-title" className={BAND}>
        <div className="grid gap-3 md:gap-4 lg:grid-cols-[1fr_1.5fr]">
          <Photo
            src="https://picsum.photos/seed/nyah-portrait/800/1000"
            alt="Portrait of Nyah, founder of Trybe, smiling at the camera"
            chip="Photo: Nyah"
            className="h-80 rounded-card bg-lavender md:h-[480px] md:rounded-[36px] lg:h-auto lg:min-h-[560px]"
          />

          <div className="flex flex-col gap-3 md:gap-4">
            <div className="relative flex flex-col gap-3.5 overflow-hidden rounded-card bg-blush px-[22px] py-[26px] md:gap-[22px] md:rounded-[36px] md:p-12 lg:flex-1 lg:p-14">
              <Star className="absolute right-6 top-6 size-9 text-orchid md:right-10 md:top-10 md:size-[52px]" />
              <p className="eyebrow">Meet the founder</p>
              <h2
                id="nyah-title"
                className="display text-[56px] tracking-[-0.01em] md:text-[72px] lg:text-[92px]"
              >
                Meet Nyah
              </h2>
              {/* Bio copy is verbatim from the design brief — do not paraphrase. */}
              <p className="max-w-[680px] text-[17px] leading-[1.55] md:text-xl md:leading-[1.6]">
                Singer, songwriter and the voice behind Frontline, Big Boys and
                Hooligans, these days she&apos;s also the founder of Trybe,
                throwing events for millennials that fuse funky house with a
                reminder every mum needs to hear: you can want the best for your
                kids and still be dope doing it. Mums have a life, and
                Nyah&apos;s making sure they get to live it.
              </p>
            </div>

            <p className="eyebrow ml-2 mt-2">Join Nyah at</p>
            {/* [REPLACE: real Funky Fit and Pilates & Party links] */}
            <Bento columns={2} gap="md">
              <LinkCard title="Funky Fit" href="#nyah" bgVariant="purple" />
              <LinkCard
                title="Pilates & Party"
                href="#nyah"
                bgVariant="periwinkle"
              />
            </Bento>
          </div>
        </div>
      </Section>

      {/* ───────────── 4. About Trybe ───────────── */}
      <Section id="about" aria-labelledby="about-title" className={BAND}>
        <div className="grid gap-3 md:gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-4 rounded-card border-[1.5px] border-border bg-surface px-[22px] py-[26px] md:gap-[22px] md:rounded-[36px] md:p-12 lg:p-16">
            <p className="eyebrow">About Trybe</p>
            <h2
              id="about-title"
              className="display text-balance text-[46px] tracking-[-0.01em] md:text-[60px] lg:text-[76px]"
              style={TIGHT}
            >
              Every family needs its{" "}
              <span className="text-lavender">tribe</span>
            </h2>
            <p className="max-w-[620px] text-[17px] leading-[1.55] md:text-xl md:leading-[1.6]">
              Trybe brings families together through fun events, experiences
              and activities for children. We create moments that little ones
              love taking part in — and that parents love being part of.
            </p>
            <p className="max-w-[620px] text-[17px] leading-[1.55] md:text-xl md:leading-[1.6]">
              Whether it&apos;s a festive singing session or a day out
              together, every Trybe experience is about connection, play and
              memories worth keeping.
            </p>
            <Button as="a" href="#events" className="w-full sm:w-auto sm:self-start">
              See what&apos;s on
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-rows-[1fr_auto]">
            <Photo
              src="https://picsum.photos/seed/kids-activity/800/600"
              alt="Children laughing and taking part in a group activity together"
              className="col-span-2 h-[170px] rounded-[20px] bg-orchid md:h-[260px] md:rounded-[36px] lg:h-auto lg:min-h-[260px]"
            />
            <div className="flex flex-col gap-3 rounded-[18px] bg-periwinkle p-4 text-white md:rounded-[28px] md:p-6">
              <StrokeIcon className="hidden size-8 md:block">
                <circle cx="8" cy="8" r="3" />
                <circle cx="16.5" cy="9" r="2.5" />
                <path d="M2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M13 15.5c1-.9 2.2-1.5 3.5-1.5 2.8 0 5 2.4 5 5.5" />
              </StrokeIcon>
              <p className="text-base font-extrabold leading-tight md:text-[19px]">
                Family connection
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-[18px] bg-indigo p-4 text-white md:rounded-[28px] md:p-6">
              <StrokeIcon className="hidden size-8 text-orchid md:block">
                <path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.6z" />
              </StrokeIcon>
              <p className="text-base font-extrabold leading-tight md:text-[19px]">
                Memorable experiences
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── 5. Final CTA ───────────── */}
      <Section aria-labelledby="cta-title" className={BAND}>
        <div className="relative flex flex-col items-center gap-[18px] overflow-hidden rounded-card bg-trybe-purple px-6 py-10 text-center text-white md:gap-[26px] md:rounded-[36px] md:px-16 md:py-24">
          <Star className="pointer-events-none absolute -bottom-[70px] -right-[60px] hidden size-[380px] text-white opacity-[0.12] md:block" />
          <Star className="relative size-9 text-orchid md:size-11" />
          <h2
            id="cta-title"
            className="display relative max-w-[900px] text-balance text-[48px] tracking-[-0.01em] md:text-[72px] lg:text-[92px]"
          >
            Your next family memory starts here
          </h2>
          <p className="relative hidden max-w-[520px] text-xl leading-normal text-blush md:block">
            Find an experience your children will love and book their place
            today.
          </p>
          <Button
            as="a"
            href="#events"
            variant="on-dark"
            className="relative w-full md:w-auto md:px-8"
          >
            Explore Upcoming Events
          </Button>
        </div>
      </Section>
    </>
  );
}
