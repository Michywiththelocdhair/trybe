import type { Metadata } from "next";
import { EventCard } from "@/components/event-card";
import { LinkCard } from "@/components/link-card";

export const metadata: Metadata = {
  title: "Cards preview",
  robots: { index: false, follow: false },
};

// DEMO DATA for design review only. Dates, venues and prices are illustrative
// (except Studio Stars, which uses the confirmed £100 ticket price).
export default function CardsPreviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 px-6 py-16 md:px-10">
      <h1 className="display text-[56px] md:text-[88px]">Cards preview</h1>

      <section aria-labelledby="event-default" className="flex flex-col gap-4">
        <h2 id="event-default" className="eyebrow">
          EventCard — default
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* PLACEHOLDER PHOTO — user to replace */}
          <EventCard
            eventType="Dance class"
            title="Funky Fit"
            description="High-energy dance and fitness for kids, set to music they love."
            metadata="Sat 15 Nov · The Old Church, SW9 · £15"
            href="#"
            imageSrc="https://picsum.photos/seed/funky-fit/800/600"
            imageAlt="Children dancing together in a bright studio"
          />
          {/* PLACEHOLDER PHOTO — user to replace */}
          <EventCard
            eventType="Workshop"
            title="Pilates & Party"
            description="Pilates for kids and grown-ups, followed by a party to finish."
            metadata="Sun 16 Nov · The Old Church, SW9 · £12"
            href="#"
            imageSrc="https://picsum.photos/seed/pilates-party/800/600"
            imageAlt="A parent and child doing pilates on mats"
            tag={{ label: "Featured" }}
          />
          {/* PLACEHOLDER PHOTO — user to replace */}
          <EventCard
            eventType="Showcase"
            title="Studio Stars"
            description="A stage showcase where kids step into the spotlight and shine."
            metadata="Date TBC · Venue TBC · Tickets £100"
            href="#"
            imageSrc="https://picsum.photos/seed/studio-stars/800/600"
            imageAlt="Children performing on a stage under bright lights"
            tag={{ label: "Studio Stars", variant: "studio-stars" }}
          />
        </div>
      </section>

      <section aria-labelledby="event-featured" className="flex flex-col gap-4">
        <h2 id="event-featured" className="eyebrow">
          EventCard — featured
        </h2>
        {/* PLACEHOLDER PHOTO — user to replace */}
        <EventCard
          featured
          eventType="Dance class"
          title="Funky Fit"
          description="High-energy dance and fitness for kids, set to music they love."
          metadata="Sat 15 Nov · The Old Church, SW9 · £15"
          href="#"
          imageSrc="https://picsum.photos/seed/funky-fit-wide/1200/700"
          imageAlt="Children dancing together in a bright studio"
          tag={{ label: "Featured" }}
        />
      </section>

      <section aria-labelledby="link-cards" className="flex flex-col gap-4">
        <h2 id="link-cards" className="eyebrow">
          LinkCard
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <LinkCard title="Funky Fit" href="#" />
          <LinkCard title="Pilates & Party" href="#" bgVariant="periwinkle" />
        </div>
      </section>
    </main>
  );
}
