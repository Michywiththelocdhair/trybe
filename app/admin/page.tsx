import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { CapacityBar, usageByEvent, type HoldRow } from "@/components/admin/capacity";
import { adminReadClient } from "@/components/admin/db";
import { currentTimeMs, formatDateTime, formatEventDate } from "@/components/admin/format";
import { requireAdmin } from "@/components/admin/is-admin";
import { BookingStatusBadge } from "@/components/admin/status-badge";
import {
  Notice,
  PageHeader,
  Panel,
  SectionHeading,
  Td,
  Th,
  tableLinkClass,
} from "@/components/admin/ui";
import { formatGbp } from "@/lib/booking/pricing";

export const metadata: Metadata = { title: { absolute: "Dashboard · Trybe Admin" } };

/**
 * Live, per-request, session-gated data: this page is meant to stream in rather
 * than prerender, so opt out of Cache Components' instant-navigation warnings.
 */
export const instant = false;


const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  const { admin } = await requireAdmin();

  const db = await adminReadClient();
  const nowMs = currentTimeMs();
  const since = new Date(nowMs - DAY_MS).toISOString();

  const [eventsRes, lastDayRes, recentRes] = await Promise.all([
    db
      .from("events")
      .select("id, name, event_date, status, max_children")
      .order("event_date", { ascending: true }),
    db.from("bookings").select("status, subtotal_pence").gte("created_at", since),
    db
      .from("bookings")
      .select("id, created_at, parent_name, event_id, child_count, status, subtotal_pence")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const events = eventsRes.data ?? [];
  const published = events.filter((e) => e.status === "published");

  // Capacity needs the published events' bookings, so it runs second.
  const holdsRes =
    published.length > 0
      ? await db
          .from("bookings")
          .select("event_id, child_count, status, expires_at")
          .in("event_id", published.map((e) => e.id))
          .in("status", ["confirmed", "pending_payment"])
      : { data: [] as HoldRow[], error: null };
  const usage = usageByEvent(holdsRes.data ?? [], nowMs);

  const lastDay = lastDayRes.data ?? [];
  const confirmedLastDay = lastDay.filter((b) => b.status === "confirmed");
  const pendingLastDay = lastDay.filter((b) => b.status === "pending_payment").length;
  const revenuePence = confirmedLastDay.reduce((sum, b) => sum + b.subtotal_pence, 0);

  const eventById = new Map(events.map((e) => [e.id, e]));
  const recent = recentRes.data ?? [];

  const loadFailed = Boolean(
    eventsRes.error || lastDayRes.error || recentRes.error || holdsRes.error,
  );

  return (
    <Container className="py-8">
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${admin.email}.`}
      />

      {loadFailed ? (
        <div className="pb-6">
          <Notice>
            Some figures couldn&apos;t be loaded. Refresh the page; if it keeps
            happening, check the Supabase connection.
          </Notice>
        </div>
      ) : null}

      <div className="flex flex-col gap-10">
        {/* Today */}
        <section aria-labelledby="today-heading">
          <SectionHeading id="today-heading" hint="Last 24 hours">
            Today
          </SectionHeading>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="New bookings"
              value={String(lastDay.length)}
              note={pendingLastDay > 0 ? `${pendingLastDay} awaiting payment` : undefined}
            />
            <Stat label="Confirmed" value={String(confirmedLastDay.length)} />
            <Stat label="Revenue" value={formatGbp(revenuePence)} note="Confirmed bookings only" />
          </dl>
        </section>

        {/* Capacity */}
        <section aria-labelledby="capacity-heading">
          <SectionHeading id="capacity-heading" hint="Confirmed plus live payment holds">
            Capacity
          </SectionHeading>
          {published.length === 0 ? (
            <Panel className="p-6">
              <p className="text-[16px] text-periwinkle">No published events right now.</p>
            </Panel>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
              {published.map((event) => {
                const used = usage.get(event.id)?.used ?? 0;
                const remaining = Math.max(0, event.max_children - used);
                return (
                  <li key={event.id}>
                    <Panel className="flex h-full flex-col gap-4 p-5">
                      <div className="flex flex-col gap-0.5">
                        <h3 className="text-[19px] font-extrabold leading-[1.25] text-indigo">
                          {event.name}
                        </h3>
                        <p className="text-[15px] text-periwinkle">
                          {formatEventDate(event.event_date)}
                        </p>
                      </div>
                      <CapacityBar
                        used={used}
                        max={event.max_children}
                        label={`${event.name} capacity`}
                      />
                      <dl className="m-0 grid grid-cols-3 gap-2 text-[15px]">
                        <Figure label="Used" value={used} />
                        <Figure label="Remaining" value={remaining} emphasis />
                        <Figure label="Max" value={event.max_children} />
                      </dl>
                    </Panel>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent bookings */}
        <section aria-labelledby="recent-heading">
          <SectionHeading id="recent-heading">Recent bookings</SectionHeading>
          <Panel className="overflow-hidden">
            {recent.length === 0 ? (
              <p className="p-6 text-[16px] text-periwinkle">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <caption className="sr-only">The 10 most recent bookings</caption>
                  <thead>
                    <tr>
                      <Th>Booked</Th>
                      <Th>Parent</Th>
                      <Th>Event</Th>
                      <Th className="text-right">Children</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Total</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blush">
                    {recent.map((b) => (
                      <tr key={b.id}>
                        <Td className="whitespace-nowrap">{formatDateTime(b.created_at)}</Td>
                        <Td>
                          <Link href={`/admin/bookings/${b.id}`} className={tableLinkClass}>
                            {b.parent_name}
                          </Link>
                        </Td>
                        <Td>{eventById.get(b.event_id)?.name ?? "—"}</Td>
                        <Td className="text-right tabular-nums">{b.child_count}</Td>
                        <Td>
                          <BookingStatusBadge status={b.status} />
                        </Td>
                        <Td className="text-right tabular-nums">{formatGbp(b.subtotal_pence)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <p className="pt-3">
            <Link href="/admin/bookings" className={tableLinkClass}>
              View all bookings
            </Link>
          </p>
        </section>
      </div>
    </Container>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Panel className="flex flex-col gap-1 p-5">
      <dt className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-periwinkle">
        {label}
      </dt>
      <dd className="m-0 text-[34px] font-extrabold leading-[1.1] tabular-nums text-indigo">
        {value}
      </dd>
      {note ? <dd className="m-0 text-[14px] text-periwinkle">{note}</dd> : null}
    </Panel>
  );
}

function Figure({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-[13px] text-periwinkle">{label}</dt>
      <dd
        className={`m-0 tabular-nums ${emphasis ? "text-[22px] font-extrabold text-trybe-purple" : "text-[18px] font-bold text-indigo"}`}
      >
        {value}
      </dd>
    </div>
  );
}
