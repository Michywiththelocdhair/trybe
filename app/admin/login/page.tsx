import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/components/admin/is-admin";
import { LoginForm } from "@/components/admin/login-form";
import { Notice, Panel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Live, per-request, session-gated data: this page is meant to stream in rather
 * than prerender, so opt out of Cache Components' instant-navigation warnings.
 */
export const instant = false;


const MESSAGES: Record<string, string> = {
  "not-authorized":
    "That email isn't on the admin list. Contact Nyah to request access.",
  "link-expired":
    "That sign-in link has expired or was already used. Request a new one below.",
};

/**
 * The one admin page that does NOT call requireAdmin(): it has to render for
 * signed-out visitors, and requireAdmin() would redirect straight back here.
 * It uses the non-redirecting getAdmin() instead, to skip the form for someone
 * who is already signed in.
 *
 * The page is a Server Component so it can read ?error= and check the session;
 * the interactive form is the LoginForm Client Component.
 */
export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const session = await getAdmin();
  if (session) redirect("/admin");

  const { error } = await searchParams;
  const errorKey = Array.isArray(error) ? error[0] : error;
  const message = errorKey ? MESSAGES[errorKey] : undefined;

  return (
    <div className="grid min-h-dvh place-items-center bg-surface-soft px-6 py-12">
      <div className="flex w-full max-w-[460px] flex-col gap-6">
        <p
          className="display text-[44px] text-indigo"
          style={{ lineHeight: 0.95 }}
        >
          Trybe <span className="text-trybe-purple">Admin</span>
        </p>

        <Panel className="flex flex-col gap-6 p-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-extrabold leading-[1.2] text-indigo">
              Sign in
            </h1>
            <p className="text-[16px] leading-[1.5] text-periwinkle">
              We&apos;ll email you a link. No password needed.
            </p>
          </div>

          {message ? <Notice>{message}</Notice> : null}

          <LoginForm />
        </Panel>
      </div>
    </div>
  );
}
