import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout. Deliberately bare — only sets the <html>/<body> and the
 * default metadata. Nav, footer and page chrome live in sibling route
 * groups so each surface can shape itself:
 *
 *   /app/(site)/*  — public site (home, Studio Stars, booking, previews)
 *                    wrapped by SiteNav + SiteFooter
 *   /app/admin/*   — admin dashboard, its own sidebar shell
 *   /app/api/*     — API routes, no chrome
 */
export const metadata: Metadata = {
  title: {
    default: "Trybe — fun experiences for families",
    template: "%s · Trybe",
  },
  description:
    "Discover fun-filled experiences, activities and events that bring children and families together.",
  metadataBase: new URL("https://trybe.uk"),
  openGraph: {
    siteName: "Trybe",
    type: "website",
    locale: "en_GB",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#62358c" },
    { media: "(prefers-color-scheme: dark)", color: "#452c86" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-trybe-purple focus:px-5 focus:py-3 focus:text-base focus:font-bold focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
