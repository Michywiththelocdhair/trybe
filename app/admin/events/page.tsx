import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { CapacityBar, usageByEvent, type HoldRow } from "@/components/admin/capacity";
import { ComingSoonButton } from "@/components/admin/coming-soon-button";
import { adminReadClient } from "@/components/admin/db";
import { currentTimeMs, formatEventDate } from "@/components/admin/format";
import { requireAdmin } from "@/components/admin/is-admin";
import { EventStatusBadge } from "@/components/admin/status-badge";
import { Notice, PageHeader, Panel, Td, Th } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Events" };

/**
 * Live, per-request, session-gated data: this page is meant to stream in rather
 * than prerender, so opt out of Cache Components' instant-navigation warnings.
 */
export const instant = false;


const EDIT_MESSAGE = "Event editing coming in Phase 4";

/**
 * Read-only for the MVP. The Edit / New event buttons are stubs that show a
 * toast; the table is already shaped for the editing UI added in Phase 4.
 */
export default async function AdminEventsPage() {
  await requireAdmin();

  const db = await adminReadClient();
  const nowMs = currentTimeMs();

  const [eventsRes, holdsRes] = await Promise.all([
    db
      .from("events")
      .select("id, name, subtitle, event_date, status, max_children")
      .order("event_date", { ascending: false }),
    db
      .from("bookings")
      .select("event_id, child_count, status, expires_at")
      .in("status", ["confirmed", "pending_payment"]),
  ]);

  const events = eventsRes.data ?? [];
  const holds: HoldRow[] = holdsRes.data ?? [];
  const usage = usageByEvent(holds, nowMs);

  return (
    <Container className="py-8">
      <PageHeader
        title="Events"
        description="Everything on the calendar, newest first."
        actions={
          <ComingSoonButton variant="primary" message={EDIT_MESSAGE}>
            New event
          </ComingSoonButton>
        }
      />

      {eventsRes.error || holdsRes.error ? (
        <div className="pb-6">
          <Notice>
            {eventsRes.error
              ? "Couldn't load events. Refresh the page and try again."
              : "Booking counts couldn't be loaded, so the figures below may be too low."}
          </Notice>
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        {events.length === 0 ? (
          <p className="p-8 text-[16px] text-periwinkle">No events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <caption className="sr-only">Events</caption>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Bookings</Th>
                  <Th>Capacity used</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blush">
                {events.map((event) => {
                  const u = usage.get(event.id);
                  const used = u?.used ?? 0;
                  return (
                    <tr key={event.id} className="hover:bg-blush/40">
                      <Td>
                        <span className="block font-bold text-indigo">{event.name}</span>
                        {event.subtitle ? (
                          <span className="block text-[14px] text-periwinkle">{event.subtitle}</span>
                        ) : null}
                      </Td>
                      <Td className="whitespace-nowrap">{formatEventDate(event.event_date)}</Td>
                      <Td>
                        <EventStatusBadge status={event.status} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {u?.confirmedBookings ?? 0}
                        {u && u.pendingBookings > 0 ? (
                          <span className="block text-[13px] text-periwinkle">
                            +{u.pendingBookings} pending
                          </span>
                        ) : null}
                      </Td>
                      <Td className="min-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <CapacityBar
                            used={used}
                            max={event.max_children}
                            label={`${event.name} capacity`}
                          />
                          <span className="text-[14px] tabular-nums text-periwinkle">
                            {used} of {event.max_children} places
                          </span>
                        </div>
                      </Td>
                      <Td className="text-right">
                        <ComingSoonButton message={EDIT_MESSAGE} label={`Edit ${event.name}`}>
                          Edit
                        </ComingSoonButton>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Container>
  );
}
