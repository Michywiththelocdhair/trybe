"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { Field } from "@/components/form/field";
import { TextInput } from "@/components/form/text-input";
import { sendMagicLink } from "@/app/admin/login/actions";
import { Notice } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

/**
 * Magic-link sign-in. The link lands on /admin?code=..., where proxy.ts
 * exchanges the code for a session.
 *
 * The email is sent by the sendMagicLink Server Action rather than the browser
 * Supabase client: lib/env.ts parses the whole process.env object, which Next
 * does not inline into client bundles, so supabaseBrowser() throws in the
 * browser today. The server route also stores the PKCE verifier cookie just
 * the same, and never reveals whether an address has an account.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;

    setStatus({ kind: "sending" });
    try {
      const result = await sendMagicLink(address);
      setStatus(
        result.ok
          ? { kind: "sent", email: address }
          : { kind: "error", message: result.error },
      );
    } catch {
      setStatus({
        kind: "error",
        message: "Sign-in isn't available right now. Please try again shortly.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-[20px] font-extrabold leading-[1.3] text-indigo">
          Check {status.email} for your sign-in link
        </p>
        <p className="text-[16px] leading-[1.5] text-periwinkle">
          Open the link in this same browser. It can only be used once.
        </p>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatus({ kind: "idle" })}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  const sending = status.kind === "sending";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Email address" htmlFor="admin-email" required>
        <TextInput
          id="admin-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sending}
          aria-invalid={status.kind === "error"}
          aria-describedby={status.kind === "error" ? "admin-email-error" : undefined}
        />
      </Field>

      {status.kind === "error" ? (
        <div id="admin-email-error">
          <Notice>{status.message}</Notice>
        </div>
      ) : null}

      <Button type="submit" disabled={sending || email.trim() === ""}>
        {sending ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}
