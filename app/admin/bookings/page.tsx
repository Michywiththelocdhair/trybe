import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { Container } from "@/components/layout/container";
import { adminReadClient } from "@/components/admin/db";
import {
  BOOKING_STATUS_LABEL,
  TIME_WINDOW_LABEL,
  formatDateTime,
  formatEventDate,
} from "@/components/admin/format";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { requireAdmin } from "@/components/admin/is-admin";
import { BookingStatusBadge } from "@/components/admin/status-badge";
import {
  Notice,
  PageHeader,
  Panel,
  Td,
  Th,
  controlClass,
  tableLinkClass,
} from "@/components/admin/ui";
import { formatGbp } from "@/lib/booking/pricing";
import {
  BOOKING_STATUSES,
  PAGE_SIZE,
  TIME_WINDOWS,
  bookingsHref,
  hasActiveFilters,
  parseBookingFilters,
  parsePage,
} from "./filters";
import { fetchBookingsPage } from "./queries";

export const metadata: Metadata = { title: "Bookings" };

/**
 * Live, per-request, session-gated data: this page is meant to stream in rather
 * than prerender, so opt out of Cache Components' instant-navigation warnings.
 */
export const instant = false;


export default async function AdminBookingsPage({
  searchParams,
}: PageProps<"/admin/bookings">) {
  await requireAdmin();

  const params = await searchParams;
  const filters = parseBookingFilters(params);
  const page = parsePage(params.page);

  const db = await adminReadClient();
  const [list, eventsRes] = await Promise.all([
    fetchBookingsPage(db, filters, page, PAGE_SIZE),
    db.from("events").select("id, name, event_date").order("event_date", { ascending: false }),
  ]);

  const events = eventsRes.data ?? [];
  const eventById = new Map(events.map((e) => [e.id, e]));

  const rows = list.ok ? list.rows : [];
  const total = list.ok ? list.total : 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(total, (page - 1) * PAGE_SIZE + rows.length);
  const filtered = hasActiveFilters(filters);

  return (
    <Container className="py-8">
      <PageHeader
        title="Bookings"
        description={
          list.ok
            ? `${total.toLocaleString("en-GB")} ${total === 1 ? "booking" : "bookings"}${filtered ? " match these filters" : " in total"}.`
            : undefined
        }
        actions={<ExportCsvButton filters={filters} />}
      />

      {/* Filters: a plain GET form, so every filtered view is a shareable link. */}
      <form
        method="get"
        action="/admin/bookings"
        aria-label="Filter bookings"
        className="mb-6"
      >
        <Panel className="grid grid-cols-2 items-end gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <FilterField id="f-status" label="Status" wide>
            <select id="f-status" name="status" defaultValue={filters.status ?? ""} className={controlClass}>
              <option value="">All statuses</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField id="f-event" label="Event" wide>
            <select id="f-event" name="event" defaultValue={filters.event ?? ""} className={controlClass}>
              <option value="">All events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {formatEventDate(e.event_date)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField id="f-window" label="Time window" wide>
            <select
              id="f-window"
              name="time_window"
              defaultValue={filters.time_window ?? ""}
              className={controlClass}
            >
              <option value="">All windows</option>
              {TIME_WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {TIME_WINDOW_LABEL[w]}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField id="f-from" label="Booked from">
            <input id="f-from" type="date" name="from" defaultValue={filters.from ?? ""} className={controlClass} />
          </FilterField>

          <FilterField id="f-to" label="Booked to">
            <input id="f-to" type="date" name="to" defaultValue={filters.to ?? ""} className={controlClass} />
          </FilterField>

          <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
            <Button type="submit" size="sm">
              Apply
            </Button>
            {filtered ? (
              <Link href="/admin/bookings" className={tableLinkClass}>
                Reset
              </Link>
            ) : null}
          </div>
        </Panel>
      </form>

      {!list.ok || eventsRes.error ? (
        <div className="mb-6">
          <Notice>
            {list.ok
              ? "The event list couldn't be loaded, so event names may be missing."
              : list.error}
          </Notice>
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-8">
            <p className="text-[17px] font-semibold text-indigo">
              {page > 1
                ? "There are no bookings on this page."
                : filtered
                  ? "No bookings match these filters."
                  : "No bookings yet."}
            </p>
            {page > 1 || filtered ? (
              <Link href={page > 1 ? bookingsHref(filters) : "/admin/bookings"} className={tableLinkClass}>
                {page > 1 ? "Back to page 1" : "Clear filters"}
              </Link>
            ) : null}
          </div>
        ) : (
          // Both axes scroll inside this box so the header row can stay stuck
          // to its top edge while the table scrolls.
          <div className="max-h-[calc(100dvh-22rem)] min-h-[200px] overflow-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <caption className="sr-only">
                Bookings, newest first. Page {page} of {pageCount}.
              </caption>
              <thead>
                <tr>
                  <Th>Booked</Th>
                  <Th>Parent</Th>
                  <Th>Event</Th>
                  <Th className="text-right">Children</Th>
                  <Th>Time window</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                  <Th>
                    <span className="sr-only">Details</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blush">
                {rows.map((b) => (
                  <tr key={b.id} className="hover:bg-blush/40">
                    <Td className="whitespace-nowrap">{formatDateTime(b.created_at)}</Td>
                    <Td>
                      <span className="block font-bold text-indigo">{b.parent_name}</span>
                      <span className="block break-all text-[14px] text-periwinkle">
                        {b.parent_email}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">{eventById.get(b.event_id)?.name ?? "—"}</Td>
                    <Td className="text-right tabular-nums">{b.child_count}</Td>
                    <Td className="whitespace-nowrap">{TIME_WINDOW_LABEL[b.time_window]}</Td>
                    <Td>
                      <BookingStatusBadge status={b.status} />
                    </Td>
                    <Td className="text-right tabular-nums">{formatGbp(b.subtotal_pence)}</Td>
                    <Td className="text-right">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={tableLinkClass}
                        aria-label={`View booking for ${b.parent_name}`}
                      >
                        View
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {rows.length > 0 ? (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-3 pt-4"
        >
          <p className="text-[15px] text-periwinkle">
            Showing {firstShown}–{lastShown} of {total.toLocaleString("en-GB")}
          </p>
          <div className="flex items-center gap-3">
            {page > 1 ? (
              <Button as="a" href={bookingsHref(filters, page - 1)} variant="outline" size="sm" rel="prev">
                Previous
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            <span className="text-[15px] font-semibold text-indigo">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Button as="a" href={bookingsHref(filters, page + 1)} variant="outline" size="sm" rel="next">
                Next
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </Container>
  );
}

function FilterField({
  id,
  label,
  wide,
  children,
}: {
  id: string;
  label: string;
  /** Spans both columns on phones (selects); date inputs sit side by side. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-[6px] ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <label htmlFor={id} className="text-[14px] font-bold text-indigo">
        {label}
      </label>
      {children}
    </div>
  );
}
