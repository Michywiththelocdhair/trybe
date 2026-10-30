import Link from "next/link";
import { Container } from "@/components/layout/container";
import { NewsletterSignup } from "@/components/newsletter-signup";

const EXPLORE_LINKS = [
  { label: "Home", href: "/" },
  { label: "Upcoming Events", href: "/#events" },
  { label: "Meet Nyah", href: "/#nyah" },
  { label: "About Trybe", href: "/#about" },
  { label: "Studio Stars", href: "/studio-stars" },
] as const;

// The three legal pages don't exist yet, so these routes 404 until they're written.
const LEGAL_LINKS = [
  { label: "Privacy [TBC]", href: "/privacy" },
  { label: "Terms [TBC]", href: "/terms" },
  { label: "Safeguarding [TBC]", href: "/safeguarding" },
] as const;

const MUTED = "text-[color:var(--border-lilac)]";
const HEADING =
  "mb-2 text-sm font-extrabold uppercase tracking-[0.1em] text-white";
const LINK =
  "inline-flex min-h-11 items-center text-[17px] text-white no-underline underline-offset-4 hover:underline";

/**
 * SiteFooter — indigo block: wordmark, sitemap, contact, legal and a bottom bar.
 * "use cache" is required: the component reads the current year, which Cache
 * Components won't allow in a plain server component.
 */
export async function SiteFooter() {
  "use cache";
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 bg-indigo py-16 text-white md:mt-16 md:py-20">
      <Container>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-x-8">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            {/* TODO: swap the text wordmark for the Trybe SVG logo once supplied. */}
            <Link
              href="/"
              aria-label="Trybe home"
              className="display self-start text-[48px] text-white no-underline"
              style={{ lineHeight: 0.95 }}
            >
              Trybe
            </Link>
            <p className={`hidden max-w-xs text-[17px] leading-[1.55] md:block ${MUTED}`}>
              Fun events, experiences and activities that bring children and
              families together.
            </p>
            <NewsletterSignup />
          </div>

          <nav aria-label="Footer">
            <p className={HEADING}>Explore</p>
            <ul className="m-0 flex list-none flex-col p-0">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className={HEADING}>Contact</p>
            <ul className="m-0 flex list-none flex-col p-0">
              <li>
                <a href="mailto:hello@trybe.uk" className={LINK}>
                  hello@trybe.uk
                </a>
              </li>
              <li>
                {/* [REPLACE: phone number] */}
                <span className={`inline-flex min-h-11 items-center text-[17px] ${MUTED}`}>
                  [REPLACE: phone]
                </span>
              </li>
            </ul>
          </div>

          <nav aria-label="Legal" className="col-span-2 md:col-span-1">
            <p className={HEADING}>Legal</p>
            <ul className="m-0 flex list-none flex-col p-0">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/20 pt-6 text-[15px]">
          <p>© {year} Trybe</p>
          {/* [REPLACE: Instagram and Facebook links] */}
          <p className={MUTED}>[REPLACE: Instagram] · [REPLACE: Facebook]</p>
        </div>
      </Container>
    </footer>
  );
}
