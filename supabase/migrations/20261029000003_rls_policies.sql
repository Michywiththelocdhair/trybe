-- =============================================================================
-- Migration 000003: table privileges + Row Level Security
--
-- Access matrix (phase-3-backend-spec.md, "RLS summary"):
--
--   table                    public (anon)            admin (authenticated)   service_role
--   events                   SELECT published only    SELECT all              ALL
--   bookings                 -                        SELECT                  ALL
--   children                 -                        SELECT (via booking)    ALL
--   waitlist_entries         INSERT only              SELECT all              ALL
--   email_log                -                        SELECT all              ALL
--   stripe_webhook_events    -                        -                       ALL
--   newsletter_subscribers   INSERT only              SELECT all              ALL
--   admin_users              -                        SELECT own row only     ALL
--
-- TWO LAYERS, BOTH REQUIRED
--   1. GRANTs decide whether a role may touch a table at all.
--   2. RLS policies decide which rows, once the GRANT has let it in.
-- A missing GRANT fails with "permission denied for table X" BEFORE RLS runs.
--
-- Why explicit GRANTs: Supabase stopped auto-granting privileges on new
-- public-schema tables (new projects from 30 May 2026; existing projects from
-- 30 Oct 2026). service_role BYPASSES RLS but still needs GRANTs, so without the
-- statements below every server-side booking call would fail. The REVOKE first
-- makes projects on the old default (everything granted to anon/authenticated)
-- end up identical to projects on the new one: least privilege, in both cases.
--
-- service_role bypasses RLS entirely, so it gets no policies, only GRANTs.
-- Writes by admins go through Server Actions that use service_role after
-- verifying the admin session, which is why `authenticated` gets no
-- INSERT/UPDATE/DELETE grants or policies on admin-managed tables.
--
-- Admin check used throughout (per spec), with auth.uid() wrapped in a
-- sub-select so Postgres evaluates it once per query rather than once per row:
--   exists (select 1 from public.admin_users a where a.id = (select auth.uid()))
--
-- Policies that are "public" are granted TO anon AND authenticated. A signed-in
-- user (e.g. an admin testing the public site in the same browser) is the
-- `authenticated` Postgres role, not `anon`, so an anon-only policy would lock
-- them out of public pages and forms.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enable RLS on every table. With RLS on and no matching policy, access is denied.
-- (Idempotent: enabling twice is a no-op.)
-- -----------------------------------------------------------------------------
alter table public.events                 enable row level security;
alter table public.bookings               enable row level security;
alter table public.children               enable row level security;
alter table public.waitlist_entries       enable row level security;
alter table public.email_log              enable row level security;
alter table public.stripe_webhook_events  enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.admin_users            enable row level security;


-- -----------------------------------------------------------------------------
-- GRANTs
-- -----------------------------------------------------------------------------
revoke all on table
  public.events,
  public.bookings,
  public.children,
  public.waitlist_entries,
  public.email_log,
  public.stripe_webhook_events,
  public.newsletter_subscribers,
  public.admin_users
from anon, authenticated;

-- Public reads (RLS narrows events to published rows).
grant select on public.events to anon, authenticated;

-- Public write-only forms: no SELECT, so submitted data cannot be read back.
grant insert on public.waitlist_entries, public.newsletter_subscribers to anon, authenticated;

-- Admin reads (RLS restricts every one of these to rows an admin may see).
grant select on
  public.bookings,
  public.children,
  public.waitlist_entries,
  public.email_log,
  public.newsletter_subscribers,
  public.admin_users
to authenticated;

-- Server-side: full access. RLS is bypassed, so this is the only gate.
grant select, insert, update, delete on
  public.events,
  public.bookings,
  public.children,
  public.waitlist_entries,
  public.email_log,
  public.stripe_webhook_events,
  public.newsletter_subscribers,
  public.admin_users
to service_role;


-- -----------------------------------------------------------------------------
-- events
-- Permissive policies are OR-ed: an admin matches both and sees every row;
-- everyone else matches only the published one.
-- -----------------------------------------------------------------------------
drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "events_select_admin" on public.events;
create policy "events_select_admin"
  on public.events
  for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));


-- -----------------------------------------------------------------------------
-- bookings
-- No public policy at all, so anon can neither read nor write. This is also what
-- keeps bookings.internal_notes and parents' contact details away from the public.
-- Inserts happen only through create_booking_with_children (service_role).
-- -----------------------------------------------------------------------------
drop policy if exists "bookings_select_admin" on public.bookings;
create policy "bookings_select_admin"
  on public.bookings
  for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));


-- -----------------------------------------------------------------------------
-- children
-- "SELECT if their booking is visible". The sub-select on bookings is itself
-- subject to the caller's RLS, so a child row is visible exactly when its
-- booking row is, i.e. to admins today, and to anyone a future bookings policy
-- admits, without having to touch this policy.
-- -----------------------------------------------------------------------------
drop policy if exists "children_select_via_booking" on public.children;
create policy "children_select_via_booking"
  on public.children
  for select
  to authenticated
  using (exists (select 1 from public.bookings b where b.id = children.booking_id));


-- -----------------------------------------------------------------------------
-- waitlist_entries
-- Public may INSERT only. Callers must NOT chain `.select()` onto the insert
-- (supabase-js: `return=representation`), because reading the row back needs a
-- SELECT policy that the public does not have. The WITH CHECK stops a visitor
-- pre-filling admin-managed columns.
-- -----------------------------------------------------------------------------
drop policy if exists "waitlist_entries_insert_public" on public.waitlist_entries;
create policy "waitlist_entries_insert_public"
  on public.waitlist_entries
  for insert
  to anon, authenticated
  with check (
    notified_at is null
    and converted_booking_id is null
  );

drop policy if exists "waitlist_entries_select_admin" on public.waitlist_entries;
create policy "waitlist_entries_select_admin"
  on public.waitlist_entries
  for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));


-- -----------------------------------------------------------------------------
-- email_log: admin read only. Rows are written by the server (service_role).
-- -----------------------------------------------------------------------------
drop policy if exists "email_log_select_admin" on public.email_log;
create policy "email_log_select_admin"
  on public.email_log
  for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));


-- -----------------------------------------------------------------------------
-- stripe_webhook_events: RLS enabled, deliberately NO policies and NO grants
-- for anon/authenticated. Only service_role (webhook route) can touch it.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- newsletter_subscribers
-- Public may INSERT only (same no-read-back caveat as waitlist_entries). A
-- duplicate email raises 23505; callers should treat that as success so the form
-- does not reveal who is already subscribed.
-- -----------------------------------------------------------------------------
drop policy if exists "newsletter_subscribers_insert_public" on public.newsletter_subscribers;
create policy "newsletter_subscribers_insert_public"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (
    resend_contact_id is null
    and unsubscribed_at is null
  );

drop policy if exists "newsletter_subscribers_select_admin" on public.newsletter_subscribers;
create policy "newsletter_subscribers_select_admin"
  on public.newsletter_subscribers
  for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));


-- -----------------------------------------------------------------------------
-- admin_users
-- A signed-in user can see only their own row. This is also what makes the admin
-- check in the policies above work for them: the sub-select on admin_users runs
-- under this policy and finds their row if, and only if, they are an admin.
-- Granting/revoking admin is done with service_role (or the SQL editor).
-- -----------------------------------------------------------------------------
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using (id = (select auth.uid()));
