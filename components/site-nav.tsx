import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/button";
import { Container } from "@/components/layout/container";
import { MobileMenu } from "@/components/mobile-menu";

/**
 * Hrefs use "/#section" (not bare "#section") so the links also work when the
 * nav is shown on other routes such as /studio-stars.
 */
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Upcoming Events", href: "/#events" },
  { label: "Meet Nyah", href: "/#nyah" },
  { label: "About Trybe", href: "/#about" },
] as const;

const BOOK_HREF = "/studio-stars/book";
const BOOK_LABEL = "Book your child's slot";

/**
 * SiteNav — sticky brand-palette header.
 * Mobile (<768px): wordmark, "Book" pill and a hamburger that opens MobileMenu.
 * Desktop (>=768px): wordmark, centred links and the primary booking CTA.
 */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
      <Container className="flex items-center justify-between gap-4 py-3 md:py-[14px]">
        <Link
          href="/"
          aria-label="Trybe home"
          className="relative block shrink-0"
        >
          <Image
            src="/images/logo.png"
            alt="Trybe"
            width={120}
            height={40}
            className="h-8 w-auto md:h-10"
            priority
          />
        </Link>

        <nav aria-label="Primary" className="hidden md:block md:flex-1">
          <ul className="m-0 flex list-none items-center justify-center gap-1.5 p-0">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center rounded-pill px-3 py-2.5 text-base font-semibold text-ink no-underline transition-colors hover:bg-blush lg:px-4 lg:text-[17px]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:block">
          <Button as="a" href={BOOK_HREF} size="sm">
            {/* [REPLACE: confirm the shorter "Book a slot" label shown at md widths] */}
            <span className="lg:hidden">Book a slot</span>
            <span className="hidden lg:inline">Book your child&apos;s slot</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button as="a" href={BOOK_HREF} size="sm">
            Book
          </Button>
          <MobileMenu
            links={NAV_LINKS}
            cta={{ label: BOOK_LABEL, href: BOOK_HREF }}
          />
        </div>
      </Container>
    </header>
  );
}
