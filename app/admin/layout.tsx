import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Button } from "@/components/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdmin } from "@/components/admin/is-admin";
import { signOut } from "./login/actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Trybe Admin" },
  robots: { index: false, follow: false },
};

// The shell reads the session on every request; see the note on each page.
export const instant = false;

/**
 * Admin shell.
 *
 * - /admin lives OUTSIDE the (site) route group, so it doesn't inherit the
 *   public SiteNav / SiteFooter. The dashboard renders in normal flow with
 *   just its own sidebar.
 * - Auth is read in <AdminShell>, inside <Suspense>, because the site runs with
 *   Cache Components: anything touching cookies must sit under a boundary.
 * - This layout does NOT redirect. It also wraps /admin/login, which must be
 *   reachable signed-out. Layouts don't re-render on client navigation, so the
 *   authoritative check is requireAdmin() at the top of every page and action.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-[color:var(--surface-sunk)] text-ink">
      <Suspense fallback={<ShellFallback />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <p className="text-[16px] font-semibold text-periwinkle">Loading…</p>
    </div>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  const session = await getAdmin();

  // Signed out (or not on the allowlist): render the page bare. That is the
  // login screen, or a page about to redirect to it.
  if (!session) return <>{children}</>;

  const { admin } = session;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="flex flex-col gap-3 bg-indigo px-4 py-3 text-white md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:gap-8 md:self-start md:px-5 md:py-6">
        <div className="flex items-center justify-between gap-3">
          <p
            className="display text-[30px] text-white"
            style={{ lineHeight: 0.95 }}
          >
            Trybe <span className="text-orchid">Admin</span>
          </p>
          <form action={signOut} className="md:hidden">
            <Button type="submit" variant="on-dark" size="sm">
              Sign out
            </Button>
          </form>
        </div>

        <AdminNav />

        <div className="hidden flex-col gap-3 md:mt-auto md:flex">
          <div className="flex flex-col gap-0.5">
            <p className="break-all text-[15px] font-semibold leading-[1.35] text-white">
              {admin.email}
            </p>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-white/80">
              {admin.role}
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="on-dark" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
