import Link from "next/link";

/**
 * SiteNav — brand-palette nav shown on all site-wide pages.
 * On /studio-stars routes, the layout wraps this in data-theme="studio-stars"
 * so the colors flip to night/sunshine automatically via CSS variables.
 */
export function SiteNav() {
  return (
    <header className="w-full border-b border-border bg-surface">
      <nav
        aria-label="Primary"
        className="max-w-[1440px] mx-auto flex items-center justify-between gap-6 px-6 py-5 md:px-10 md:py-6"
      >
        <Link
          href="/"
          className="font-display text-[28px] md:text-[32px] text-ink no-underline"
          aria-label="Trybe home"
        >
          Trybe
        </Link>

        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          <li>
            <Link
              href="/#whats-on"
              className="text-ink hover:text-accent-strong no-underline font-semibold"
            >
              What&rsquo;s on
            </Link>
          </li>
          <li>
            <Link
              href="/#sessions"
              className="text-ink hover:text-accent-strong no-underline font-semibold"
            >
              Sessions
            </Link>
          </li>
          <li>
            <Link
              href="/studio-stars"
              className="text-ink hover:text-accent-strong no-underline font-semibold"
            >
              Studio Stars
            </Link>
          </li>
          <li>
            <Link
              href="/#about"
              className="text-ink hover:text-accent-strong no-underline font-semibold"
            >
              About
            </Link>
          </li>
        </ul>

        <Link
          href="/studio-stars/book"
          className="inline-flex items-center min-h-[48px] px-5 rounded-pill bg-accent text-white font-extrabold no-underline"
        >
          Book a slot
        </Link>
      </nav>
    </header>
  );
}
