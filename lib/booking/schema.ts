/**
 * Booking schema — shared between the Server Action (actions.ts) and
 * the client form (booking-form.tsx).
 *
 * Lives here, not in actions.ts, because a "use server" file is only
 * allowed to export async functions. Types are erased at runtime, but
 * zod schemas are runtime values — they belong in a plain module.
 */
import { z } from "zod";
import {
  MAX_CHILD_AGE,
  MAX_CHILDREN_PER_BOOKING,
  MIN_CHILD_AGE,
} from "@/lib/booking/pricing";

export const BookingSchema = z.object({
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
          .min(
            MIN_CHILD_AGE,
            `Age must be between ${MIN_CHILD_AGE} and ${MAX_CHILD_AGE}`,
          )
          .max(
            MAX_CHILD_AGE,
            `Age must be between ${MIN_CHILD_AGE} and ${MAX_CHILD_AGE}`,
          ),
      }),
    )
    .min(1, "Add at least one child")
    .max(
      MAX_CHILDREN_PER_BOOKING,
      `You can book up to ${MAX_CHILDREN_PER_BOOKING} children at once`,
    ),
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
  attendance: z.enum(
    ["stay", "drop"],
    "Please tell us if you’ll stay or drop off",
  ),
  agreeToTerms: z.literal(
    true,
    "Please agree to the booking terms to continue",
  ),
});

export type BookingInput = z.infer<typeof BookingSchema>;

export type BookingResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; errors: Record<string, string> };
