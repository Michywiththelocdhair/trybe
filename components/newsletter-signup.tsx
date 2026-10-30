"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/lib/newsletter/actions";
import type { NewsletterState } from "@/lib/newsletter/types";

export function NewsletterSignup() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(
    subscribeToNewsletter,
    null,
  );

  if (state?.success) {
    return (
      <p role="status" className="text-[17px] font-extrabold text-white">
        You&apos;re in! 🎉 Check your inbox.
      </p>
    );
  }

  return (
    <form action={action} className="flex max-w-sm flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email"
          disabled={pending}
          className="min-h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[17px] text-white placeholder:text-white/60 focus:outline-2 focus:outline-sunshine disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 shrink-0 cursor-pointer rounded-full bg-sunshine px-5 text-[15px] font-extrabold tracking-wider text-night disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Joining…" : "Join the Trybe"}
        </button>
      </div>
      {state && !state.success && (
        <p role="alert" className="text-sm text-blush">
          {state.error}
        </p>
      )}
    </form>
  );
}
