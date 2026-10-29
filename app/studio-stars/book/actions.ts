"use server";

import { z } from "zod";
import { BookingSchema, type BookingResult } from "./schema";

/** First message per field path, e.g. "children.0.age" or "parentEmail". */
function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {
    form: "Please check your details and try again.",
  };
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/**
 * PHASE 2 STUB. Validates the input for real, then pretends a Stripe Checkout
 * Session was created. Nothing is saved, charged or emailed.
 *
 * Phase 3 will:
 *  - Insert the booking into Supabase with status "pending"
 *  - Create a Stripe Checkout Session with line items built from
 *    calculateTotal(parsed.data.children.length) (the price is ALWAYS computed
 *    on the server; never trust an amount sent by the client)
 *  - Return the real Stripe checkout URL (absolute https://…) for the client to
 *    redirect to. The client already redirects on absolute URLs and shows the
 *    in-page confirmation for the relative stub URL below.
 */
export async function createBookingSession(
  input: unknown,
): Promise<BookingResult> {
  const parsed = BookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error) };
  }

  // STUB: pretend the Stripe session was created.
  return { ok: true, checkoutUrl: "/studio-stars/book?stub=success" };
}
