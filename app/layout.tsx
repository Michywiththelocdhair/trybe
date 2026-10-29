import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh flex flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
