/**
 * Shared booking queries for the list page and the CSV export, so both apply
 * identical filters. Server-only; takes the client as an argument so callers
 * choose session (reads) or service-role (never needed here) access.
 */
import "server-only";
import {
  londonDayStartIso,
  londonNextDayStartIso,
} from "@/components/admin/format";
import type { AdminClient, BookingRow } from "@/components/admin/db";
import type { BookingFilters } from "./filters";

export const LIST_COLUMNS =
  "id, created_at, parent_name, parent_email, event_id, child_count, time_window, status, subtotal_pence" as const;

export type BookingListRow = Pick<
  BookingRow,
  | "id"
  | "created_at"
  | "parent_name"
  | "parent_email"
  | "event_id"
  | "child_count"
  | "time_window"
  | "status"
  | "subtotal_pence"
>;

export const EXPORT_COLUMNS =
  "id, created_at, status, event_id, parent_name, parent_email, parent_phone, child_count, time_window, attendance, subtotal_pence" as const;

export type BookingExportRow = Pick<
  BookingRow,
  | "id"
  | "created_at"
  | "status"
  | "event_id"
  | "parent_name"
  | "parent_email"
  | "parent_phone"
  | "child_count"
  | "time_window"
  | "attendance"
  | "subtotal_pence"
>;


/** The filter methods shared by every PostgREST query builder. */
interface FilterChain<Self> {
  eq(column: string, value: string): Self;
  gte(column: string, value: string): Self;
  lt(column: string, value: string): Self;
}

/** Apply the active filters. Used by both the list and the export so they agree. */
function applyFilters<Q extends FilterChain<Q>>(query: Q, filters: BookingFilters): Q {
  let q = query;
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.event) q = q.eq("event_id", filters.event);
  if (filters.time_window) q = q.eq("time_window", filters.time_window);
  if (filters.from) {
    const start = londonDayStartIso(filters.from);
    if (start) q = q.gte("created_at", start);
  }
  if (filters.to) {
    const end = londonNextDayStartIso(filters.to);
    if (end) q = q.lt("created_at", end);
  }
  return q;
}

/** Fetch one page of the filtered list, newest first, with the total match count. */
export async function fetchBookingsPage(
  db: AdminClient,
  filters: BookingFilters,
  page: number,
  pageSize: number,
): Promise<
  | { ok: true; rows: BookingListRow[]; total: number }
  | { ok: false; error: string }
> {
  const offset = (page - 1) * pageSize;
  const query = applyFilters(
    db.from("bookings").select(LIST_COLUMNS, { count: "exact" }),
    filters,
  )
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return { ok: false, error: "Couldn't load bookings. Please refresh and try again." };
  const rows: BookingListRow[] = data ?? [];
  return { ok: true, rows, total: count ?? rows.length };
}

const EXPORT_CHUNK = 1000;
const EXPORT_MAX_ROWS = 20_000;

/** Fetch every booking matching the filters (chunked past PostgREST's row cap). */
export async function fetchAllBookingsForExport(
  db: AdminClient,
  filters: BookingFilters,
): Promise<
  | { ok: true; rows: BookingExportRow[]; truncated: boolean }
  | { ok: false; error: string }
> {
  const all: BookingExportRow[] = [];

  for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += EXPORT_CHUNK) {
    const query = applyFilters(db.from("bookings").select(EXPORT_COLUMNS), filters)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + EXPORT_CHUNK - 1);

    const { data, error } = await query;
    if (error) return { ok: false, error: "Couldn't load bookings for export." };
    const chunk: BookingExportRow[] = data ?? [];
    all.push(...chunk);
    if (chunk.length < EXPORT_CHUNK) return { ok: true, rows: all, truncated: false };
  }

  return { ok: true, rows: all, truncated: true };
}
