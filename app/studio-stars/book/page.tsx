import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book your child's slot — Studio Stars",
  description:
    "Reserve a spot at Studio Stars. £100 per child, £80 for a second ticket.",
};

export default function BookPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16 md:py-24">
      <p className="eyebrow" style={{ color: "var(--sunshine)" }}>
        Booking · scaffold
      </p>
      <h1 className="display text-[56px] md:text-[88px] mt-2">
        Book your child&rsquo;s slot
      </h1>
      <p className="text-[#E4D8F0] text-[19px] leading-7 max-w-xl mt-6">
        £100 per ticket, 20% off the second. Phase 3 wires this to Stripe + Supabase.
      </p>
    </div>
  );
}
