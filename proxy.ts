/**
 * Session refresh + optimistic /admin gate.
 *
 * NOTE: Next.js 16 renamed the `middleware` file convention to `proxy`
 * (`middleware.ts` still works but logs a deprecation warning). This is the
 * same code under the new name.
 *
 * What it does
 *  1. Refreshes the Supabase auth cookies on every request so `getUser()` in
 *     Server Components sees a live session.
 *  2. Optimistic gate: a signed-out visitor to /admin/* (except /admin/login)
 *     is redirected to /admin/login before anything renders. This only checks
 *     that a session exists. The real authorisation (the `admin_users` row)
 *     happens in `requireAdmin()` on every page and Server Action.
 *  3. Magic-link landing: Supabase redirects to `/admin?code=...` (PKCE). The
 *     code is exchanged for a session here, then the visitor is redirected to
 *     a clean `/admin`.
 *
 * Without Supabase env vars the public site is untouched, and /admin returns a
 * clear 503 instead of crashing.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN_PATH = "/admin/login";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isAdminPath) {
      return new NextResponse(
        "Admin is unavailable: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.",
        { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        // Update the incoming request first so Server Components in THIS
        // request see the refreshed tokens, then rebuild the response and
        // write the cookies (plus the no-cache headers) onto it.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  /** Redirect while keeping any cookies / headers the auth client just set. */
  const redirectTo = (path: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, key) => {
      if (["cache-control", "expires", "pragma"].includes(key)) {
        redirect.headers.set(key, value);
      }
    });
    return redirect;
  };

  // Magic-link landing: exchange the PKCE code for a session.
  const code = request.nextUrl.searchParams.get("code");
  if (pathname === "/admin" && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? redirectTo(LOGIN_PATH, "?error=link-expired") : redirectTo("/admin");
  }

  // Required: refreshes the auth token if it has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminPath && !user && pathname !== LOGIN_PATH) {
    // Supabase appends error_code=otp_expired when a link is stale or reused.
    const linkProblem = request.nextUrl.searchParams.has("error_code");
    return redirectTo(LOGIN_PATH, linkProblem ? "?error=link-expired" : "");
  }

  return response;
}

export const config = {
  // Skip static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
