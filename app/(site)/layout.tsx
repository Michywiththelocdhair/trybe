/**
 * Public site layout — wraps everything that is NOT /admin or /api with the
 * SiteNav and SiteFooter. The route group `(site)` doesn't affect URLs:
 * /app/(site)/page.tsx is still served at `/`, /app/(site)/studio-stars/page.tsx
 * at `/studio-stars`, etc.
 *
 * This split exists because the admin dashboard shouldn't inherit the public
 * nav + footer. Pre-split, Worker C had to overlay the admin with a fixed
 * z-50 layer to hide them — now the admin layout can just render in-flow.
 */
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
