import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { NewsletterSignup } from "@/components/newsletter-signup";

const MUTED = "text-[color:var(--border-lilac)]";
const FOOTER_LINK =
  "inline-flex min-h-11 items-center text-[16px] text-white underline-offset-4 hover:underline";

export async function SiteFooter() {
  "use cache";
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer mt-12 bg-indigo py-12 text-white md:mt-16 md:py-16">
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] md:items-start md:gap-16">
          <div className="flex flex-col gap-4">
            <Link href="/" aria-label="Trybe home" className="relative block self-start">
              <Image
                src="/images/logo.png"
                alt="Trybe"
                width={1244}
                height={1244}
                className="h-20 w-auto brightness-0 invert md:h-24"
              />
            </Link>
            <p className={`max-w-sm text-[16px] leading-relaxed ${MUTED}`}>
              Fun events, experiences and activities that bring children and families together.
            </p>
            <NewsletterSignup />
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <p className="text-sm font-extrabold uppercase tracking-[0.1em]">Contact</p>
            <a className={FOOTER_LINK} href="mailto:trybeappuk@gmail.com">
              trybeappuk@gmail.com
            </a>
            <a
              className={FOOTER_LINK}
              href="https://www.instagram.com/trybeuk/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
          </div>

        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-5 text-sm">
          <p className={MUTED}>© {year} Tired Ass Mum LTD. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/privacy" className={`${MUTED} underline-offset-4 hover:underline`}>Privacy policy</Link>
            <Link href="/terms" className={`${MUTED} underline-offset-4 hover:underline`}>Terms &amp; conditions</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
