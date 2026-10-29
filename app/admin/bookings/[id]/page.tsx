import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { Container } from "@/components/layout/container";
import { CancelBookingDialog } from "@/components/admin/cancel-booking-dialog";
import { ChildSlotForm } from "@/components/admin/child-slot-form";
import { adminReadClient } from "@/components/admin/db";
import {
  ATTENDANCE_LABEL,
  TIME_WINDOW_LABEL,
  TIME_WINDOW_RANGE,
  formatDateTime,
  formatEventDate,
  isoToLondonLocal,
} from "@/components/admin/format";
import { InternalNotesForm } from "@/components/admin/internal-notes-form";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { BookingStatusBadge } from "@/components/admin/status-badge";
import {
  Notice,
  PageHeader,
  Panel,
  SectionHeading,
  tableLinkClass,
} from "@/components/admin/ui";
import { formatGbp } from "@/lib/booking/pricing";
import { isUuid } from "../filters";

export const metadata: Metadata = { title: "Booking" };

/**
 * Live, per-request, session-gated data: this page is meant to stream in rather
 * than prerender, so opt out of Cache Components' instant-navigation warnings.
 */
export const instant = false;


export default async function AdminBookingDetailPage({
  params,
}: PageProps<"/admin/bookings/[id]">) {
  const { admin } = await requireAdmin();

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const db = await adminReadClient();
  const { data: booking, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <Container className="py-8">
        <BackLink />
        <Notice>Couldn&apos;t load this booking. Refresh the page and try again.</Notice>
      </Container>
    );
  }
  if (!booking) notFound();

  const [eventRes, childrenRes] = await Promise.all([
    db
      .from("events")
      .select("id, name, subtitle, event_date, venue")
      .eq("id", booking.event_id)
      .maybeSingle(),
    db
      .from("children")
      .select("id, position, first_name, age, scheduled_at, song_choice, notes")
      .eq("booking_id", booking.id)
      .order("position", { ascending: true }),
  ]);

  const event = eventRes.data;
  const children = childrenRes.data ?? [];
  const editable = canWrite(admin.role);
  const cancellable = booking.status === "pending_payment" || booking.status === "confirmed";
  const willRefund =
    booking.status === "confirmed" && booking.stripe_payment_intent_id !== null;

  return (
    <Container className="py-8">
      <BackLink />

      <PageHeader
        title={booking.parent_name}
        description={`Booking ${booking.id}`}
        actions={<BookingStatusBadge status={booking.status} />}
      />

      {!editable ? (
        <div className="pb-6">
          <Notice tone="info">Your account has view-only access, so changes are disabled.</Notice>
        </div>
      ) : null}
      {eventRes.error || childrenRes.error ? (
        <div className="pb-6">
          <Notice>Some details couldn&apos;t be loaded. Refresh the page to try again.</Notice>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          {/* Booking summary */}
          <section aria-labelledby="summary-heading">
            <SectionHeading id="summary-heading">Booking</SectionHeading>
            <Panel className="p-5">
              <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Detail label="Parent">{booking.parent_name}</Detail>
                <Detail label="Email">
                  <a href={`mailto:${booking.parent_email}`} className="break-all font-semibold text-trybe-purple underline underline-offset-2">
                    {booking.parent_email}
                  </a>
                </Detail>
                <Detail label="Phone">
                  <a href={`tel:${booking.parent_phone}`} className="font-semibold text-trybe-purple underline underline-offset-2">
                    {booking.parent_phone}
                  </a>
                </Detail>
                <Detail label="Event">
                  {event ? (
                    <>
                      {event.name}
                      <span className="block text-[14px] font-normal text-periwinkle">
                        {formatEventDate(event.event_date)}
                        {event.venue ? ` · ${event.venue}` : ""}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </Detail>
                <Detail label="Status">
                  <BookingStatusBadge status={booking.status} />
                </Detail>
                <Detail label="Subtotal">{formatGbp(booking.subtotal_pence)}</Detail>
                <Detail label="Children">{booking.child_count}</Detail>
                <Detail label="Preferred time window">
                  {TIME_WINDOW_LABEL[booking.time_window]}
                  <span className="block text-[14px] font-normal text-periwinkle">
                    {TIME_WINDOW_RANGE[booking.time_window]}
                  </span>
                </Detail>
                <Detail label="Attendance">{ATTENDANCE_LABEL[booking.attendance]}</Detail>
                <Detail label="Booked">{formatDateTime(booking.created_at)}</Detail>
                <Detail label="Confirmed">{formatDateTime(booking.confirmed_at)}</Detail>
                {booking.cancelled_at ? (
                  <Detail label="Cancelled">{formatDateTime(booking.cancelled_at)}</Detail>
                ) : null}
                {booking.status === "pending_payment" ? (
                  <Detail label="Payment hold expires">{formatDateTime(booking.expires_at)}</Detail>
                ) : null}
                <Detail label="Agreed to terms">
                  {formatDateTime(booking.agreed_to_terms_at)}
                  <span className="block text-[14px] font-normal text-periwinkle">
                    Version {booking.terms_version}
                  </span>
                </Detail>
                <Detail label="Stripe payment">
                  <span className="break-all font-mono text-[14px] font-normal">
                    {booking.stripe_payment_intent_id ?? "None yet"}
                  </span>
                </Detail>
                {booking.notes ? (
                  <div className="sm:col-span-2">
                    <Detail label="Note from parent">
                      <span className="whitespace-pre-wrap font-normal">{booking.notes}</span>
                    </Detail>
                  </div>
                ) : null}
              </dl>
            </Panel>
          </section>

          {/* Children + time slots */}
          <section aria-labelledby="children-heading">
            <SectionHeading
              id="children-heading"
              hint="Times are Europe/London. Leave blank until assigned."
            >
              Children and time slots
            </SectionHeading>
            <Panel>
              {children.length === 0 ? (
                <p className="p-5 text-[16px] text-periwinkle">No children found on this booking.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-blush p-0">
                  {children.map((child) => (
                    <li key={child.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[18px] font-extrabold text-indigo">
                          {child.first_name}
                          <span className="pl-2 text-[15px] font-semibold text-periwinkle">
                            age {child.age}
                            {child.position > 1 ? " · sibling" : ""}
                          </span>
                        </p>
                        {child.song_choice ? (
                          <p className="text-[14px] text-periwinkle">Song: {child.song_choice}</p>
                        ) : null}
                        {child.notes ? (
                          <p className="text-[14px] text-periwinkle">Note: {child.notes}</p>
                        ) : null}
                        <p className="text-[14px] text-periwinkle">
                          {child.scheduled_at
                            ? `Scheduled ${formatDateTime(child.scheduled_at)}`
                            : "No slot assigned yet"}
                        </p>
                      </div>
                      <ChildSlotForm
                        childId={child.id}
                        childName={child.first_name}
                        initialValue={isoToLondonLocal(child.scheduled_at)}
                        eventDate={event?.event_date ?? ""}
                        disabled={!editable}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>
        </div>

        <div className="flex flex-col gap-8">
          {/* Actions */}
          <section aria-labelledby="actions-heading">
            <SectionHeading id="actions-heading">Actions</SectionHeading>
            <Panel className="flex flex-col gap-4 p-5">
              {cancellable ? (
                <CancelBookingDialog
                  bookingId={booking.id}
                  parentName={booking.parent_name}
                  childCount={booking.child_count}
                  refundLabel={willRefund ? formatGbp(booking.subtotal_pence) : null}
                  disabled={!editable}
                />
              ) : (
                <p className="text-[15px] text-periwinkle">
                  This booking is {booking.status.replace("_", " ")}, so it can&apos;t be cancelled.
                </p>
              )}
              <div className="flex flex-col gap-1">
                <Button variant="outline" disabled>
                  Mark as attended
                </Button>
                <p className="text-[14px] text-periwinkle">Coming in a later phase.</p>
              </div>
            </Panel>
          </section>

          {/* Internal notes */}
          <section aria-labelledby="notes-heading">
            <SectionHeading id="notes-heading">Notes</SectionHeading>
            <Panel className="p-5">
              <InternalNotesForm
                bookingId={booking.id}
                initialNotes={booking.internal_notes ?? ""}
                disabled={!editable}
              />
            </Panel>
          </section>
        </div>
      </div>
    </Container>
  );
}

function BackLink() {
  return (
    <p className="pb-2">
      <Link href="/admin/bookings" className={tableLinkClass}>
        &larr; All bookings
      </Link>
    </p>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-periwinkle">
        {label}
      </dt>
      <dd className="m-0 text-[16px] font-semibold leading-[1.4] text-indigo">{children}</dd>
    </div>
  );
}
