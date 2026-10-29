import Link from "next/link";

/**
 * SiteFooter — indigo block with sitemap, contact, and legal.
 * Content is placeholder — [REPLACE] markers show what the user should swap in.
 */
export async function SiteFooter() {
  "use cache";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-indigo text-white mt-20">
      <div className="max-w-[1440px] mx-auto px-6 py-16 md:px-10 md:py-20 grid gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <p className="font-display uppercase text-[48px] leading-[0.95] m-0">
            Trybe
          </p>
          <p className="text-[17px] leading-6 text-[#E4D8F0] m-0 max-w-sm">
            Fun-filled experiences, activities and events that bring children
            and families together.
          </p>
        </div>

        <nav aria-label="Sitemap" className="flex flex-col gap-3">
          <p className="eyebrow m-0" style={{ color: "#FFD447" }}>
            Explore
          </p>
          <Link href="/#whats-on" className="text-white no-underline">
            What&rsquo;s on
          </Link>
          <Link href="/#sessions" className="text-white no-underline">
            Sessions
          </Link>
          <Link href="/studio-stars" className="text-white no-underline">
            Studio Stars
          </Link>
        </nav>

        <nav aria-label="Contact" className="flex flex-col gap-3">
          <p className="eyebrow m-0" style={{ color: "#FFD447" }}>
            Say hello
          </p>
          <a
            href="mailto:hello@trybe.uk"
            className="text-white no-underline break-all"
          >
            hello@trybe.uk
          </a>
          <span className="text-[#E4D8F0] text-sm">
            [REPLACE: phone, address]
          </span>
        </nav>

        <nav aria-label="Legal" className="flex flex-col gap-3">
          <p className="eyebrow m-0" style={{ color: "#FFD447" }}>
            Small print
          </p>
          <Link href="/privacy" className="text-white no-underline">
            Privacy
          </Link>
          <Link href="/terms" className="text-white no-underline">
            Terms
          </Link>
          <Link href="/safeguarding" className="text-white no-underline">
            Safeguarding
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/15">
        <div className="max-w-[1440px] mx-auto px-6 py-6 md:px-10 flex flex-wrap items-center justify-between gap-4 text-sm text-[#E4D8F0]">
          <p className="m-0">© {year} Trybe. All rights reserved.</p>
          <p className="m-0">Built with care for families in the UK.</p>
        </div>
      </div>
    </footer>
  );
}
