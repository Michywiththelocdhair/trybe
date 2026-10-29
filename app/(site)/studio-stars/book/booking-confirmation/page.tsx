import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/button";
import { Container } from "@/components/layout/container";
import { formatEventDate } from "@/lib/dates";
import { supabaseService } from "@/lib/supabase/service";
import { formatGbp } from "@/lib/booking/pricing";

export const metadata: Metadata = {
  title: "Booking confirmation — Studio Stars",
  // Contains a parent's details; never index or follow.
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Where Stripe sends the parent after checkout:
 *   /studio-stars/book/booking-confirmation?booking=<uuid>&session=cs_...
 *
 * The booking is only CONFIRMED by the Stripe webhook, which can land a moment
 * after the redirect. So this page shows the success panel once the booking is
 * confirmed, and a friendly "processing" panel until then.
 *
 * Booking details are only shown when BOTH unguessable ids match, so knowing
 * (or guessing) one of them reveals nothing.
 *
 * Cache Components: reading searchParams / the database is request-time work,
 * so it lives behind <Suspense> and the static shell prerenders.
 */
export default function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="bg-[color:var(--surface-sunk)] text-night">
      <Container>
        <div className="mx-auto flex max-w-[760px] flex-col gap-7 pb-20 pt-8 md:pt-14">
          <Suspense fallback={<LoadingPanel />}>
            <ConfirmationContent searchParams={searchParams} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}

/* ── Data ─────────────────────────────────────────────────────── */

type Outcome =
  | {
      kind: "confirmed";
      parentFirstName: string;
      parentEmail: string;
      childCount: number;
      totalPence: number;
      event: {
        name: string;
        subtitle: string | null;
        venue: string | null;
        eventDate: string;
      } | null;
    }
  | { kind: "processing"; retryHref: string | null }
  | { kind: "unavailable" };

const bookingIdSchema = z.uuid();

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function loadOutcome(params: SearchParams): Promise<Outcome> {
  const bookingParam = firstParam(params.booking);
  const sessionParam = firstParam(params.session);

  const parsedId = bookingIdSchema.safeParse(bookingParam);
  if (!parsedId.success || !sessionParam) return { kind: "unavailable" };

  const retryHref =
    `/studio-stars/book/booking-confirmation` +
    `?booking=${encodeURIComponent(parsedId.data)}` +
    `&session=${encodeURIComponent(sessionParam)}`;
  const processing: Outcome = { kind: "processing", retryHref };

  try {
    const db = supabaseService();

    const { data: booking, error } = await db
      .from("bookings")
      .select(
        "id, event_id, status, parent_name, parent_email, child_count, subtotal_pence, stripe_checkout_session_id",
      )
      .eq("id", parsedId.data)
      .maybeSingle();

    if (error) throw new Error(`Supabase error ${error.code}: ${error.message}`);

    // Not found, or the session id doesn't belong to this booking: say nothing
    // about it. Same neutral panel as "webhook hasn't landed yet".
    if (!booking || booking.stripe_checkout_session_id !== sessionParam) {
      return processing;
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
      return { kind: "unavailable" };
    }
    if (booking.status !== "confirmed") return processing;

    const { data: event, error: eventError } = await db
      .from("events")
      .select("name, subtitle, venue, event_date")
      .eq("id", booking.event_id)
      .maybeSingle();
    if (eventError) {
      // Payment is confirmed; still show success, just without event details.
      console.error("[booking-confirmation] event lookup failed", {
        bookingId: booking.id,
        eventId: booking.event_id,
        code: eventError.code,
        message: eventError.message,
      });
    }

    return {
      kind: "confirmed",
      parentFirstName: booking.parent_name.trim().split(/\s+/)[0] ?? "",
      parentEmail: booking.parent_email,
      childCount: booking.child_count,
      totalPence: booking.subtotal_pence,
      event: event
        ? {
            name: event.name,
            subtitle: event.subtitle,
            venue: event.venue,
            eventDate: event.event_date,
          }
        : null,
    };
  } catch (err) {
    // Don't alarm someone who may have just paid: degrade to "processing".
    console.error("[booking-confirmation] lookup failed", {
      bookingId: parsedId.data,
      message: err instanceof Error ? err.message : String(err),
    });
    return processing;
  }
}

/* ── Panels ───────────────────────────────────────────────────── */

async function ConfirmationContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const outcome = await loadOutcome(await searchParams);

  if (outcome.kind === "confirmed") return <ConfirmedPanel {...outcome} />;
  if (outcome.kind === "processing") {
    return <ProcessingPanel retryHref={outcome.retryHref} />;
  }
  return <UnavailablePanel />;
}

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-6 rounded-block border-[1.5px] border-[color:var(--border-lilac)] bg-cream p-[clamp(24px,5vw,48px)] text-night">
      {children}
    </section>
  );
}

function ConfirmedPanel({
  parentFirstName,
  parentEmail,
  childCount,
  totalPence,
  event,
}: Extract<Outcome, { kind: "confirmed" }>) {
  const rows: Array<{ label: string; value: ReactNode }> = [];
  if (event) {
    rows.push({
      label: "Event",
      value: event.subtitle ? `${event.name} · ${event.subtitle}` : event.name,
    });
    rows.push({ label: "Date", value: formatEventDate(event.eventDate) });
    if (event.venue) rows.push({ label: "Venue", value: event.venue });
  }
  rows.push({ label: childCount === 1 ? "Child" : "Children", value: childCount });
  rows.push({ label: "Total paid", value: formatGbp(totalPence) });

  return (
    <PanelShell>
      <span
        aria-hidden="true"
        className="flex size-[72px] items-center justify-center rounded-full bg-sunshine text-night"
      >
        <CheckIcon />
      </span>

      <div className="flex flex-col gap-3">
        <h1 className="display m-0 text-[length:clamp(48px,9vw,84px)]">
          You’re booked!
        </h1>
        <p className="m-0 text-[19px] leading-[1.55] text-[color:var(--muted-plum)]">
          Thank you{parentFirstName ? `, ${parentFirstName}` : ""}. A confirmation email is
          on its way to <strong className="break-all text-night">{parentEmail}</strong>.
        </p>
      </div>

      <dl className="m-0 grid w-full gap-x-6 gap-y-4 rounded-[24px] bg-white p-6 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-[14px] font-extrabold uppercase tracking-[0.1em] text-[color:var(--muted-plum)]">
              {row.label}
            </dt>
            <dd className="m-0 text-[20px] font-bold leading-[1.3]">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="m-0 text-[17px] leading-[1.5] text-[color:var(--muted-plum)]">
        Look out for Trybe’s Christmas song list in your inbox. Your child picks their song
        from it.
      </p>

      <Button as="a" href="/studio-stars" variant="studio-stars">
        Back to Studio Stars
      </Button>
    </PanelShell>
  );
}

function ProcessingPanel({ retryHref }: { retryHref: string | null }) {
  return (
    <PanelShell>
      <span
        aria-hidden="true"
        className="flex size-[72px] items-center justify-center rounded-full bg-white text-night"
      >
        <ClockIcon />
      </span>

      <div className="flex flex-col gap-3">
        <h1 className="display m-0 text-[length:clamp(48px,9vw,84px)]">Nearly there</h1>
        <p className="m-0 text-[19px] leading-[1.55] text-[color:var(--muted-plum)]">
          Your payment is being processed. We’ll email you as soon as it’s confirmed.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {retryHref ? (
          <Button as="a" href={retryHref} variant="studio-stars">
            Check again
          </Button>
        ) : null}
        <Button as="a" href="/studio-stars" variant="studio-stars-outline-light">
          Back to Studio Stars
        </Button>
      </div>
    </PanelShell>
  );
}

function UnavailablePanel() {
  return (
    <PanelShell>
      <div className="flex flex-col gap-3">
        <h1 className="display m-0 text-[length:clamp(44px,8vw,72px)]">
          We can’t find that booking
        </h1>
        <p className="m-0 text-[19px] leading-[1.55] text-[color:var(--muted-plum)]">
          This link may be incomplete, or the booking is no longer active. You can start a
          fresh booking any time.
        </p>
      </div>
      <Button as="a" href="/studio-stars/book" variant="studio-stars">
        Book a session
      </Button>
    </PanelShell>
  );
}

function LoadingPanel() {
  return (
    <PanelShell>
      <p role="status" className="m-0 text-[19px] font-bold text-[color:var(--muted-plum)]">
        Checking your booking…
      </p>
    </PanelShell>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
