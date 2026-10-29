import { z } from "zod";

/**
 * Studio Stars pricing, confirmed in the design brief:
 *   first child       £100
 *   each sibling      £80 (20% off)
 *   total = 100 + (count - 1) * 80
 *
 * Pure module: no "use client" / "use server", so it is safe to import from the
 * client form, the Server Action and (Phase 3) the Stripe line-item builder.
 * Money is held in integer pence to avoid float drift.
 */
export const FIRST_CHILD_PRICE_PENCE = 10000; // £100
export const SIBLING_PRICE_PENCE = 8000; // £80 (20% off)

/** Derived, so the "20%" in the UI can never drift from the actual prices. */
export const SIBLING_DISCOUNT_PERCENT = Math.round(
  (1 - SIBLING_PRICE_PENCE / FIRST_CHILD_PRICE_PENCE) * 100,
);

/**
 * Booking limits shared by the client form and the Server Action schema.
 * (The design's count picker offers 1-4; the server accepts up to this max.)
 */
export const MAX_CHILDREN_PER_BOOKING = 10;
export const MIN_CHILD_AGE = 2;
export const MAX_CHILD_AGE = 16;

/** Validates a child count before pricing it. */
export const childCountSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_CHILDREN_PER_BOOKING);

export type PriceLine = {
  /** 1-based position of the child in the booking. */
  position: number;
  labelKey: "firstChild" | "sibling";
  pricePence: number;
};

export type PriceBreakdown = {
  subtotalPence: number;
  lines: PriceLine[];
};

export function calculateTotal(childCount: number): PriceBreakdown {
  const parsed = childCountSchema.safeParse(childCount);
  if (!parsed.success) return { subtotalPence: 0, lines: [] };

  const lines: PriceLine[] = Array.from({ length: parsed.data }, (_, i) => ({
    position: i + 1,
    labelKey: i === 0 ? "firstChild" : "sibling",
    pricePence: i === 0 ? FIRST_CHILD_PRICE_PENCE : SIBLING_PRICE_PENCE,
  }));
  const subtotalPence = lines.reduce((sum, line) => sum + line.pricePence, 0);
  return { subtotalPence, lines };
}

/** £180 for whole pounds (matches the design), £180.50 otherwise. */
export function formatGbp(pence: number): string {
  const whole = pence % 100 === 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}
