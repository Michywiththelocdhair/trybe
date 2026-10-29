export type EventCardTagVariant = "featured" | "studio-stars";

export interface EventCardTag {
  label: string;
  variant?: EventCardTagVariant;
}

export interface EventCardProps {
  /** Eyebrow text, e.g. "Dance class", "Workshop". */
  eventType: string;
  /** Event name. Rendered in Bricolage display (condensed, uppercase) at 36px. */
  title: string;
  /** One or two lines of supporting copy. */
  description: string;
  /** Date, place and price in one line, e.g. "Sat 15 Nov · The Old Church, SW9 · £15". */
  metadata: string;
  /** Destination for the "Discover event" CTA. */
  href: string;
  imageSrc: string;
  imageAlt: string;
  /** Optional chip overlaid top-left of the image. */
  tag?: EventCardTag;
  /** Wide layout (image left, content right) from md up. Stacks below md. */
  featured?: boolean;
}

/**
 * Tag chip for the image overlay.
 * TODO: swap for <Tag> once Worker A merges
 */
function ImageTag({ label, variant = "featured" }: EventCardTag) {
  const base =
    "absolute left-4 top-4 rounded-full px-3 py-1 text-[13px] font-extrabold uppercase tracking-[0.08em]";

  if (variant === "studio-stars") {
    // --night and --sunshine only exist inside [data-theme="studio-stars"], so
    // the chip opts into that scope itself and works on any page.
    return (
      <span data-theme="studio-stars" className={`${base} bg-night text-sunshine`}>
        {label}
      </span>
    );
  }

  return <span className={`${base} bg-white text-indigo`}>{label}</span>;
}

export function EventCard({
  eventType,
  title,
  description,
  metadata,
  href,
  imageSrc,
  imageAlt,
  tag,
  featured = false,
}: EventCardProps) {
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-card border-[1.5px] border-border bg-surface text-ink ${
        featured ? "md:flex-row" : ""
      }`}
    >
      {/* Solid periwinkle backing so the card degrades gracefully if the photo fails to load. */}
      <div
        className={`relative h-[150px] bg-periwinkle text-white ${
          featured ? "md:h-auto md:min-h-[320px] md:flex-1 md:basis-0" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- placeholder source URLs vary */}
        <img
          src={imageSrc}
          alt={imageAlt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {tag ? <ImageTag {...tag} /> : null}
      </div>

      <div
        className={`flex flex-col gap-2 p-[22px] ${
          featured ? "md:flex-1 md:basis-0 md:justify-center md:p-8" : ""
        }`}
      >
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-accent">
          {eventType}
        </p>
        {/* Inline line-height: the unlayered .display rule (0.92) would beat a Tailwind leading utility. */}
        <h3 className="display text-[36px]" style={{ lineHeight: 0.95 }}>
          {title}
        </h3>
        <p className="text-base leading-[1.45] text-ink-muted">{description}</p>
        <p className="text-[15px] font-bold">{metadata}</p>
        <a
          href={href}
          className="inline-flex min-h-12 items-center self-start rounded-pill bg-trybe-purple px-5 text-base font-extrabold text-white no-underline transition-colors hover:bg-indigo"
        >
          Discover event
          <span className="sr-only">: {title}</span>
        </a>
      </div>
    </article>
  );
}
