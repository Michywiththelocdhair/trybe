"use server";

import { z } from "zod";
import {
  MAX_CHILD_AGE,
  MAX_CHILDREN_PER_BOOKING,
  MIN_CHILD_AGE,
} from "./pricing";

/*
 * NOTE: a "use server" file may only export async functions (types are erased,
 * so `export type` is fine). That is why BookingSchema is not exported.
 */
const BookingSchema = z.object({
  children: z
    .array(
      z.object({
        firstName: z
          .string()
          .trim()
          .min(1, "Please enter your child’s first name")
          .max(50, "First name must be 50 characters or fewer"),
        age: z.coerce
          .number("Please enter an age")
          .int(`Age must be between ${MIN_CHILD_AGE} and ${MAX_CHILD_AGE}`)
          .min(MIN_CHILD_AGE, `Age must be between ${MIN_CHILD_AGE} and ${MAX_CHILD_AGE}`)
          .max(MAX_CHILD_AGE, `Age must be between ${MIN_CHILD_AGE} and ${MAX_CHILD_AGE}`),
      }),
    )
    .min(1, "Add at least one child")
    .max(MAX_CHILDREN_PER_BOOKING, `You can book up to ${MAX_CHILDREN_PER_BOOKING} children at once`),
  timeSlot: z.enum(
    ["morning", "midday", "afternoon", "any"],
    "Please choose a preferred time",
  ),
  parentName: z
    .string()
    .trim()
    .min(1, "Please enter your full name")
    .max(100, "Name must be 100 characters or fewer"),
  parentEmail: z.email("Please enter a valid email address"),
  parentPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Please enter a valid mobile number"),
  attendance: z.enum(["stay", "drop"], "Please tell us if you’ll stay or drop off"),
  agreeToTerms: z.literal(true, "Please agree to the booking terms to continue"),
});

export type BookingInput = z.infer<typeof BookingSchema>;

export type BookingResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; errors: Record<string, string> };

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
export async function createBookingSession(input: unknown): Promise<BookingResult> {
  const parsed = BookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error) };
  }

  // STUB: pretend the Stripe session was created.
  return { ok: true, checkoutUrl: "/studio-stars/book?stub=success" };
}
