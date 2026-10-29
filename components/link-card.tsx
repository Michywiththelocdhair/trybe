export type LinkCardVariant = "purple" | "periwinkle";

export interface LinkCardProps {
  /** Session name. Rendered in Bricolage display (condensed, uppercase) at 38px. */
  title: string;
  href: string;
  /** Tile background. Defaults to "purple". */
  bgVariant?: LinkCardVariant;
  /** Any CSS colour value for the title. Defaults to white. */
  textColor?: string;
}

const VARIANTS: Record<LinkCardVariant, { card: string; icon: string }> = {
  purple: { card: "bg-trybe-purple", icon: "text-trybe-purple" },
  periwinkle: { card: "bg-periwinkle", icon: "text-periwinkle" },
};

export function LinkCard({
  title,
  href,
  bgVariant = "purple",
  textColor = "var(--white)",
}: LinkCardProps) {
  const { card, icon } = VARIANTS[bgVariant];

  return (
    // Inline colour: the unlayered global `a { color }` rule would beat a Tailwind text utility.
    // focus-visible:rounded-card! stops the global :focus-visible rule squaring off the corners.
    <a
      href={href}
      style={{ color: textColor }}
      className={`flex min-h-[120px] items-center justify-between gap-4 rounded-card px-7 py-6 no-underline transition-transform hover:-translate-y-0.5 focus-visible:rounded-card! ${card}`}
    >
      {/* Inline line-height: the unlayered .display rule (0.92) would beat a Tailwind leading utility. */}
      <span className="display text-[38px]" style={{ lineHeight: 0.95 }}>
        {title}
      </span>
      <span
        aria-hidden="true"
        className={`flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white ${icon}`}
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      </span>
    </a>
  );
}
