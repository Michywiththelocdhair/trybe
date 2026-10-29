import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { Tag } from "@/components/tag";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Studio Stars — Christmas singing for kids",
  description:
    "Your child's 20-minute Christmas spotlight — book their session at The Qube, Sat 5 Dec 2026. £100 per child, siblings 20% off.",
  // openGraph is shallow-merged with the root layout, so siteName and locale
  // are repeated here to keep them.
  openGraph: {
    title: "Studio Stars — Christmas singing for kids",
    description:
      "Your child's 20-minute Christmas spotlight at The Qube. Sat 5 Dec 2026.",
    type: "website",
    siteName: "Trybe",
    locale: "en_GB",
  },
};

/* ────────────────────────────────────────────────────────────
   Shared bits
   ──────────────────────────────────────────────────────────── */

const BOOK_HREF = "/studio-stars/book";

// 4-pointed star used for every decorative sparkle.
const STAR_PATH =
  "M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z";

// Striped "photo not here yet" pattern (the artboard's .ph treatment).
const STRIPES =
  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--white) 16%, transparent) 0 2px, transparent 2px 16px)";

// Stage-light glow: sunshine fading out downwards.
const spotlight = (strength: number) =>
  `radial-gradient(ellipse at top, color-mix(in srgb, var(--sunshine) ${strength}%, transparent), transparent 70%)`;

// Placeholder photography. PLACEHOLDER PHOTO — user to replace.
const photo = (seed: string, w: number, h: number) =>
  `url("https://picsum.photos/seed/${seed}/${w}/${h}")`;

// Secondary text on light surfaces (--muted-plum is not a Tailwind colour).
const MUTED = "text-[color:var(--muted-plum)]";
const LILAC = "text-[color:var(--border-lilac)]";

// Hairline border colours that live outside the Tailwind theme.
const BORDER_LILAC = "border-[color:var(--border-lilac)]";
const BORDER_PLUM = "border-[color:var(--border-plum)]";

const H2 =
  "display tracking-[-0.01em] text-[46px] md:text-[length:clamp(42px,5vw,76px)]";

function Star({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

const ICON_PATHS = {
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  parking: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </>
  ),
  people: (
    <>
      <circle cx="8" cy="7" r="3" />
      <circle cx="17" cy="10" r="2" />
      <path d="M2.5 20c0-3.3 2.5-6.5 5.5-6.5s5.5 3.2 5.5 6.5M14 16c.8-.6 1.8-1 3-1 2.5 0 4.5 2.2 4.5 5" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 7l10 10M17 8v9H8" />,
  plus: <path d="M12 5v14M5 12h14" />,
} satisfies Record<string, ReactNode>;

type IconName = keyof typeof ICON_PATHS;

function Icon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-trybe-purple md:text-sm">
      {children}
    </p>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  className: string;
}) {
  return (
    <div className={`flex flex-col-reverse gap-0.5 ${className}`}>
      <dt className={`text-[13px] md:text-[15px] ${MUTED}`}>{label}</dt>
      <dd className="display text-[30px] md:text-[40px]">{value}</dd>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Content
   ──────────────────────────────────────────────────────────── */

const GLANCE: ReadonlyArray<{ icon: IconName; title: string; text: string }> = [
  {
    icon: "pin",
    title: "The Qube",
    text: "Parking available at the venue",
  },
  {
    icon: "clock",
    title: "20-minute sessions",
    text: "With 10-minute buffers, so no one is rushed",
  },
  {
    icon: "tag",
    title: "Siblings save 20%",
    text: "On each additional child you book",
  },
  {
    icon: "music",
    title: "Songs chosen after booking",
    text: "We email you the song list to pick from",
  },
];

// icon: null renders the sparkle used on the highlighted final step.
const STEPS: ReadonlyArray<{
  title: string;
  text: string;
  icon: IconName | null;
}> = [
  {
    title: "Book a session",
    text: "Choose your preferred time and book a dedicated 20-minute session for each child.",
    icon: "calendar",
  },
  {
    title: "Pick a song",
    text: "After booking, we’ll email you Trybe’s list of Christmas songs to choose from.",
    icon: "music",
  },
  {
    title: "Get ready to shine",
    text: "We’ll email you the details for the chosen song and the relevant arrangements.",
    icon: "mail",
  },
  {
    title: "Enjoy the experience",
    text: "Stay with your child or drop them off — whatever suits your family, subject to final event arrangements.",
    icon: null,
  },
];

const BOOK_STEPS = [
  "Your children’s names and ages",
  "Your preferred time of day",
  "Your contact details",
  "Pay securely with Stripe",
];

const CHILD_COUNTS: ReadonlyArray<{ label: string; aria: string }> = [
  { label: "1", aria: "Book for 1 child" },
  { label: "2", aria: "Book for 2 children" },
  { label: "3", aria: "Book for 3 children" },
  { label: "4+", aria: "Book for 4+ children" },
];

const FAQS: ReadonlyArray<{ q: string; a: ReactNode }> = [
  {
    q: "How long is each session?",
    a: "Each child has their own 20-minute session, with a 10-minute buffer between sessions. Recording starts from 9:00 am on Saturday 5 December 2026.",
  },
  {
    q: "How will I know my exact session time?",
    a: "You’ll tell us your preferred time of day when you book, and we’ll confirm your exact session time by email.",
  },
  {
    q: "Can I stay with my child, or drop them off?",
    a: (
      <>
        Either — you’re welcome to stay or to drop your child off.{" "}
        {/* [REPLACE: drop-off and collection arrangements once confirmed] */}
        <Tag variant="tbc">[Drop-off and collection arrangements — TBC]</Tag>
      </>
    ),
  },
  {
    q: "Is parking available?",
    a: "Yes, parking is available at The Qube.",
  },
  {
    q: "How do we choose a Christmas song?",
    a: "After you book, we’ll email you Trybe’s list of Christmas songs for your child to pick from. Once they’ve chosen, we’ll email the song details and arrangements.",
  },
  {
    q: "How does the sibling discount work?",
    a: "The first child is £100 and each additional sibling is 20% off, at £80. For example, two children cost £180 in total.",
  },
  {
    q: "How do I pay?",
    a: "You pay the full amount when you book, through Stripe’s secure checkout.",
  },
  {
    q: "What happens after I book?",
    a: "You’ll receive a confirmation email, followed by the Christmas song list. Once your child has chosen, we’ll email the song details and arrangements, along with your exact session time.",
  },
];

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */

export default function StudioStarsPage() {
  return (
    // The artboard is a light page with night + sunshine blocks, so the page
    // paints its own white surface over the route's night background.
    <div className="bg-white text-night">
      <Container className="flex flex-col gap-16 pb-16 pt-0 md:gap-28 md:pb-28 md:pt-4">
        {/* ── BREADCRUMB + HERO ───────────────────────────── */}
        <div className="flex flex-col gap-2">
          <nav aria-label="Breadcrumb" className="hidden md:block">
            <ol className={`flex flex-wrap items-center gap-2 text-base ${MUTED}`}>
              <li>
                <Link href="/" className={`underline hover:text-night ${MUTED}`}>
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/#whats-on"
                  className={`underline hover:text-night ${MUTED}`}
                >
                  Upcoming Events
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-bold text-night">
                Studio Stars
              </li>
            </ol>
          </nav>

          {/* Copy wrapper is display:contents below lg so the mobile artboard
              order (copy, photos, stats, buttons) can differ from desktop
              (copy, buttons, stats | photos) without duplicating markup. */}
          <section
            aria-labelledby="ss-title"
            className="flex flex-col gap-[22px] pb-1 pt-5 md:gap-[26px] md:pt-10 lg:flex-row lg:items-center lg:gap-12"
          >
            <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-[26px]">
              <Tag variant="studio-stars" className="order-1 gap-2 self-start">
                <Star className="size-3.5 text-sunshine" />
                Trybe presents · Studio Stars
              </Tag>

              <h1
                id="ss-title"
                className="display order-2 text-[44px] tracking-[-0.01em] text-balance md:text-[length:clamp(54px,6.6vw,104px)]"
              >
                Let your little star{" "}
                <span className="rounded-xl bg-sunshine px-[0.12em] text-night box-decoration-clone md:rounded-2xl">
                  shine
                </span>{" "}
                this Christmas
              </h1>

              <p
                className={`order-3 max-w-[500px] text-lg leading-normal md:text-[21px] ${MUTED}`}
              >
                A special Christmas singing experience where every child gets
                their moment in the spotlight.
              </p>

              <div className="order-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3 md:order-4">
                <Button
                  as="a"
                  href={BOOK_HREF}
                  variant="studio-stars"
                  className="gap-2.5"
                >
                  Book Your Child’s Slot
                  <Icon
                    name="arrowRight"
                    strokeWidth={2.5}
                    className="hidden size-[18px] md:block"
                  />
                </Button>
                {/* studio-stars-outline is white-on-night; the artboard's hero
                    sits on a light surface so the colours are flipped here. */}
                <Button
                  as="a"
                  href="#how"
                  variant="studio-stars-outline"
                  className="border-night! text-night! hover:bg-night/10!"
                >
                  Find Out How It Works
                </Button>
              </div>

              <dl className="order-5 grid grid-cols-3 md:flex md:flex-wrap lg:mt-3">
                <Stat
                  value="5 DEC"
                  label="Saturday, 2026"
                  className={`border-r-[1.5px] ${BORDER_LILAC} pr-2.5 md:mr-7 md:py-1 md:pr-7`}
                />
                <Stat
                  // [REPLACE: confirm the 5pm end time — the brief only confirms "from 9:00 am"]
                  value={
                    <>
                      <span className="md:hidden">9–5</span>
                      <span className="hidden md:inline">9AM–5PM</span>
                    </>
                  }
                  label={
                    <>
                      <span className="md:hidden">From 9:00 am</span>
                      <span className="hidden md:inline">
                        Sessions from 9:00 am
                      </span>
                    </>
                  }
                  className={`border-r-[1.5px] ${BORDER_LILAC} px-2.5 md:mr-7 md:py-1 md:pl-0 md:pr-7`}
                />
                <Stat
                  value="£100"
                  label={
                    <>
                      <span className="md:hidden">Per child</span>
                      <span className="hidden md:inline">
                        Per child · 20% off extra sibling
                      </span>
                    </>
                  }
                  className="pl-2.5 md:py-1 md:pl-0"
                />
              </dl>
            </div>

            {/* Photo cluster */}
            <div className="order-4 flex justify-center md:order-6 md:mt-5 lg:mt-0 lg:min-w-0 lg:flex-1">
              <div className="relative aspect-[620/580] w-full max-w-[620px]">
                {/* PLACEHOLDER PHOTO — user to replace */}
                <div
                  role="img"
                  aria-label="A child singing into a microphone"
                  className="absolute left-[20%] top-[3%] h-[52%] w-[42%] rounded-[22px] bg-trybe-purple bg-cover bg-center md:rounded-block"
                  style={{ backgroundImage: photo("studio-stars-singing", 520, 600) }}
                />

                <a
                  href="#how"
                  aria-label="Find out how it works"
                  className="absolute left-[55%] top-0 flex aspect-square w-[14%] items-center justify-center rounded-full border-4 border-white bg-sunshine text-night md:w-[13%] md:border-[6px]"
                >
                  <Icon
                    name="arrowUpRight"
                    strokeWidth={2.5}
                    className="size-[45%] md:size-[40%]"
                  />
                </a>

                {/* PLACEHOLDER PHOTO — user to replace */}
                <div
                  role="img"
                  aria-label="A child in headphones smiling in the studio"
                  className="absolute left-[65%] top-[18%] h-[42%] w-[35%] rounded-[22px] bg-orchid bg-cover bg-center md:rounded-block"
                  style={{ backgroundImage: photo("studio-stars-studio", 440, 500) }}
                />

                {/* Studio artwork: microphone under a stage light */}
                <div
                  role="img"
                  aria-label="Studio Stars artwork: a microphone under a stage light"
                  className="absolute left-0 top-[58%] flex h-[42%] w-1/2 items-center justify-center overflow-hidden rounded-[22px] bg-night md:rounded-block"
                >
                  <div
                    aria-hidden="true"
                    className="absolute -top-[30%] left-1/2 h-[120%] w-[90%] -translate-x-1/2"
                    style={{ background: spotlight(45) }}
                  />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 48 72"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="relative h-auto w-[26%] text-white"
                  >
                    <rect x="14" y="4" width="20" height="32" rx="10" />
                    <path d="M14 18h20M14 25h20" />
                    <path d="M8 30c0 9 7 16 16 16s16-7 16-16" />
                    <path d="M24 46v16M14 66h20" />
                  </svg>
                  <Star className="absolute left-[14%] top-[22%] hidden h-auto w-[9%] text-sunshine md:block" />
                  <Star className="absolute bottom-[22%] right-[16%] hidden h-auto w-[6%] text-orchid md:block" />
                </div>

                {/* 20 min sticker */}
                <div className="absolute left-[47%] top-[61%] flex h-[13%] w-[32%] items-center justify-center gap-1 rounded-full border-4 border-white bg-sunshine text-night md:w-[30%] md:gap-2 md:border-[6px]">
                  <Icon
                    name="music"
                    strokeWidth={2.2}
                    className="hidden size-[22px] md:block"
                  />
                  <span className="display text-base md:text-[22px]">20 min</span>
                </div>

                {/* Dots + sparkles */}
                <span
                  aria-hidden="true"
                  className="absolute left-[88%] top-[6%] hidden aspect-square w-[3.5%] rounded-full bg-orchid md:block"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-[86%] top-[74%] aspect-square w-[6%] rounded-full bg-night"
                />
                <Star className="absolute left-[5%] top-[30%] h-auto w-[7%] text-sunshine md:left-[6%]" />
                <Star className="absolute left-[74%] top-[84%] hidden h-auto w-[5%] text-trybe-purple md:block" />
              </div>
            </div>
          </section>
        </div>

        {/* ── AT A GLANCE ─────────────────────────────────── */}
        <section
          aria-labelledby="glance-title"
          className="relative flex flex-col gap-4 overflow-hidden rounded-card bg-night px-5 py-6 text-white md:gap-7 md:rounded-block md:p-8 lg:p-12"
        >
          <Star className="absolute right-10 top-9 hidden size-10 text-sunshine md:block" />
          <h2 id="glance-title" className="display text-[32px] md:text-[40px]">
            At a glance
          </h2>
          <ul className="grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
            {GLANCE.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-1 rounded-tile bg-white/[0.07] p-4 md:gap-2 md:p-6"
              >
                <Icon
                  name={item.icon}
                  className="hidden size-7 text-sunshine md:block"
                />
                <strong className="text-[17px] md:text-[21px]">{item.title}</strong>
                <span className={`text-sm md:text-[17px] ${LILAC}`}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section
          id="how"
          aria-labelledby="how-title"
          className="flex scroll-mt-24 flex-col gap-3.5 md:gap-8"
        >
          <div className="flex flex-col gap-2">
            <Eyebrow>How it works</Eyebrow>
            <h2 id="how-title" className={H2}>
              Four steps to the spotlight
            </h2>
          </div>
          <ol className="grid gap-2.5 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
            {STEPS.map((step, i) => {
              const last = i === STEPS.length - 1;
              return (
                <li
                  key={step.title}
                  className={`flex gap-4 rounded-tile p-[18px] md:min-h-[280px] md:flex-col md:gap-3.5 md:rounded-block md:p-8 ${
                    last ? "bg-sunshine text-night" : "bg-blush"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-11 flex-none items-center justify-center rounded-full font-display text-xl font-extrabold md:size-14 md:text-[26px] ${
                      last
                        ? "bg-night text-sunshine"
                        : "bg-trybe-purple text-white"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {step.icon ? (
                    <Icon
                      name={step.icon}
                      className="hidden size-9 text-trybe-purple md:mt-auto md:block"
                    />
                  ) : (
                    <Star className="hidden size-9 text-night md:mt-auto md:block" />
                  )}
                  <div className="flex flex-col gap-0.5 md:gap-3.5">
                    <h3 className="text-[19px] font-extrabold leading-[1.2] md:text-2xl">
                      {step.title}
                    </h3>
                    <p
                      className={`text-base leading-[1.45] md:text-lg md:leading-normal ${
                        last ? "" : "text-night/80"
                      }`}
                    >
                      {step.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* The artboards leave a PRICING slot empty, so nothing is built here.
            Pricing lives in the hero, the glance cards, the booking panel,
            the FAQ and the mobile sticky bar. */}

        {/* ── PARENT INFO ─────────────────────────────────── */}
        <section
          id="info"
          aria-labelledby="info-title"
          className="flex flex-col gap-3 md:gap-8"
        >
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-4">
            <div className="flex flex-col gap-2">
              <Eyebrow>For parents</Eyebrow>
              <h2 id="info-title" className={H2}>
                Good to know
              </h2>
            </div>
            <p
              className={`hidden max-w-[420px] text-[19px] leading-normal md:block ${MUTED}`}
            >
              Everything you need to plan your day.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 md:gap-4 lg:flex-row">
            {/* Venue */}
            <div className="flex min-w-0 flex-col gap-1 rounded-tile bg-indigo p-5 text-white md:flex-row md:gap-7 md:rounded-block md:p-9 lg:flex-[2]">
              <div className="flex flex-col gap-1 md:min-w-0 md:flex-1 md:gap-3">
                <Icon
                  name="pin"
                  className="hidden size-9 text-sunshine md:block"
                />
                <h3 className="text-[19px] font-extrabold md:text-[26px]">
                  Venue: The Qube
                </h3>
                <p className="text-[15px] leading-normal text-blush md:text-lg">
                  {/* [REPLACE: full street address for The Qube] */}
                  <Tag variant="tbc">[Full venue address — TBC]</Tag>
                </p>
                <p className="flex items-center gap-2 text-base font-bold md:text-lg">
                  <Icon
                    name="parking"
                    className="hidden size-[22px] flex-none text-sunshine md:block"
                  />
                  Parking available at the venue
                </p>
              </div>
              {/* [REPLACE: map embed once the address is confirmed] */}
              <div
                role="img"
                aria-label="Map placeholder for The Qube"
                className="hidden min-h-[200px] items-center justify-center rounded-tile bg-periwinkle md:flex md:flex-1"
                style={{ backgroundImage: STRIPES }}
              >
                <span className="rounded-xl bg-night/80 px-3 py-1.5 text-[15px] font-semibold">
                  Map — added once address is confirmed
                </span>
              </div>
            </div>

            {/* Timings */}
            <div className="flex min-w-0 flex-col gap-1 rounded-tile bg-sunshine p-5 text-night md:gap-3 md:rounded-block md:p-9 lg:flex-1">
              <Icon name="clock" className="hidden size-9 md:block" />
              <h3 className="text-[19px] font-extrabold md:text-[26px]">
                Sessions &amp; timings
              </h3>
              <p className="text-base leading-[1.45] md:text-lg md:leading-normal">
                Recording starts from 9:00 am. Each child has a 20-minute
                session, with 10-minute buffers between sessions. We’ll confirm
                your exact time by email.
              </p>
            </div>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2 md:gap-4">
            <div className="flex flex-col gap-1 rounded-tile bg-blush p-[18px] md:gap-3 md:rounded-block md:p-9">
              <Icon
                name="people"
                className="hidden size-9 text-trybe-purple md:block"
              />
              <h3 className="text-[17px] font-extrabold md:text-[26px]">
                Stay or drop off
              </h3>
              <p className="text-[15px] leading-[1.4] text-night/80 md:text-lg md:leading-normal">
                You’re welcome to stay with your child or drop them off.{" "}
                {/* [REPLACE: drop-off and collection arrangements once confirmed] */}
                <Tag variant="tbc">
                  [Drop-off and collection arrangements — TBC]
                </Tag>
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-tile bg-blush p-[18px] md:gap-3 md:rounded-block md:p-9">
              <Icon
                name="mail"
                className="hidden size-9 text-trybe-purple md:block"
              />
              <h3 className="text-[17px] font-extrabold md:text-[26px]">
                Everything by email
              </h3>
              <p className="text-[15px] leading-[1.4] text-night/80 md:text-lg md:leading-normal">
                Your booking confirmation, the Christmas song list, and details
                of the chosen song and arrangements all arrive by email.
              </p>
            </div>
          </div>
        </section>

        {/* ── BOOKING ENTRY (md+; the mobile artboard uses the sticky bar) ── */}
        <section
          id="book"
          aria-labelledby="book-title"
          className={`hidden scroll-mt-24 gap-10 rounded-block border-[1.5px] ${BORDER_LILAC} bg-white p-[clamp(28px,5vw,56px)] md:flex md:flex-col lg:flex-row`}
        >
          <div className="flex min-w-0 flex-col gap-5 lg:flex-1">
            <Eyebrow>Book now</Eyebrow>
            <h2
              id="book-title"
              className="display text-[length:clamp(42px,5vw,68px)]"
            >
              Book in four quick steps
            </h2>
            <ol className="flex flex-col gap-3 text-lg">
              {BOOK_STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-3.5">
                  <span
                    aria-hidden="true"
                    className="flex size-[34px] flex-none items-center justify-center rounded-full bg-blush font-extrabold text-trybe-purple"
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex min-w-0 flex-col gap-5 rounded-card bg-blush p-8 lg:flex-1">
            <div className="flex flex-col gap-1">
              <span className={`text-base font-bold ${MUTED}`}>
                Studio Stars · Sat 5 Dec 2026 · The Qube
              </span>
              <span className="text-2xl font-extrabold">
                How many children are you booking?
              </span>
            </div>
            {/* The booking page doesn't read a child count from the URL yet,
                so every option goes to the same place. */}
            <div
              role="group"
              aria-label="Number of children"
              className="flex flex-wrap gap-2.5"
            >
              {CHILD_COUNTS.map((count, i) => (
                <Link
                  key={count.label}
                  href={BOOK_HREF}
                  aria-label={count.aria}
                  className={`flex min-h-14 min-w-16 items-center justify-center rounded-2xl text-xl font-extrabold transition-colors ${
                    i === 0
                      ? "bg-night text-white hover:bg-night/90"
                      : `border-[1.5px] ${BORDER_PLUM} bg-white text-night hover:bg-cream`
                  }`}
                >
                  {count.label}
                </Link>
              ))}
            </div>
            <p className="text-[17px] leading-normal text-night/80">
              Booking two or more? Each additional sibling is 20% off — just
              £80.
            </p>
            <Button
              as="a"
              href={BOOK_HREF}
              variant="studio-stars"
              className="w-full gap-2.5"
            >
              Start booking
              <Icon name="arrowRight" strokeWidth={2.5} className="size-[18px]" />
            </Button>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="flex flex-col gap-4 lg:flex-row lg:gap-10"
        >
          <div className="flex flex-col gap-2 lg:flex-1">
            <Eyebrow>FAQs</Eyebrow>
            <h2 id="faq-title" className={H2}>
              Questions parents ask
            </h2>
          </div>
          <div className="flex min-w-0 flex-col gap-2.5 lg:flex-[2]">
            {FAQS.map((faq, i) => (
              <details
                key={faq.q}
                open={i === 0}
                className={`group rounded-tile border-[1.5px] ${BORDER_LILAC} bg-white`}
              >
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-tile px-[18px] py-3.5 text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night md:gap-4 md:px-6 md:py-5 md:text-xl [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <Icon
                    name="plus"
                    strokeWidth={2.5}
                    className="size-5 flex-none text-trybe-purple transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none md:size-[22px]"
                  />
                </summary>
                <p
                  className={`px-[18px] pb-3.5 text-base leading-[1.5] md:px-6 md:pb-5 md:text-lg md:leading-[1.55] ${MUTED}`}
                >
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────── */}
        <section
          aria-labelledby="final-title"
          className="relative flex flex-col items-center gap-[18px] overflow-hidden rounded-card bg-night px-6 py-10 text-center text-white md:gap-[26px] md:rounded-block md:px-[clamp(24px,5vw,64px)] md:py-[clamp(48px,7vw,104px)]"
        >
          <div
            aria-hidden="true"
            className="absolute -top-40 left-1/2 hidden h-[500px] w-[700px] -translate-x-1/2 md:block"
            style={{ background: spotlight(30) }}
          />
          <Star className="absolute left-[12%] top-[22%] hidden size-8 text-orchid md:block" />
          <Star className="absolute bottom-[26%] right-[14%] hidden size-[22px] text-white md:block" />
          <Star className="relative size-10 text-sunshine md:size-[52px]" />
          <h2
            id="final-title"
            className="display relative max-w-[900px] text-[48px] tracking-[-0.01em] text-balance md:text-[length:clamp(46px,6vw,92px)]"
          >
            Ready to let your little star shine?
          </h2>
          <p className={`relative hidden text-xl md:block ${LILAC}`}>
            Saturday 5 December 2026 · The Qube · £100 per child
          </p>
          <Button
            as="a"
            href={BOOK_HREF}
            variant="studio-stars"
            className="relative w-full md:w-auto md:px-8"
          >
            Book a Studio Stars Slot
          </Button>
        </section>
      </Container>

      {/* ── MOBILE STICKY BOOKING BAR ───────────────────── */}
      <div
        className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-blush bg-white px-4 pb-4 pt-3 md:hidden"
        style={{
          boxShadow:
            "0 -8px 24px color-mix(in srgb, var(--night) 12%, transparent)",
        }}
      >
        <div className="flex flex-col">
          <strong className="text-lg">£100 per child</strong>
          <span className={`text-sm ${MUTED}`}>Siblings £80 · Sat 5 Dec</span>
        </div>
        <Button as="a" href={BOOK_HREF} variant="studio-stars">
          Book a slot
        </Button>
      </div>
    </div>
  );
}
