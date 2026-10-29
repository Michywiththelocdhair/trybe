-- =============================================================================
-- Migration 000001: initial schema
--
-- Tables: events, bookings, children, waitlist_entries, email_log,
--         stripe_webhook_events, newsletter_subscribers, admin_users
--
-- Source of truth: phase-3-backend-spec.md ("Database schema"). The TypeScript
-- types in lib/supabase/types.ts are written against exactly these columns, so
-- do not rename or retype a column here without updating that file.
--
-- Conventions
--   * Idempotent: `create ... if not exists` so a re-run against a dirty DB is safe.
--   * All timestamps are timestamptz; money is integer pence in *_pence columns.
--   * All uuids default to gen_random_uuid() (built in to Postgres 13+).
--   * Status-like text columns are guarded by named CHECK constraints rather than
--     Postgres enums, so adding a value later is a one-line constraint swap
--     instead of an `alter type` dance.
--   * Postgres does NOT index foreign keys automatically. FK -> index map:
--       bookings.event_id               -> bookings_event_id_status_idx (leading column)
--       children.booking_id             -> children_booking_id_position_key (leading column)
--       waitlist_entries.event_id       -> waitlist_entries_event_id_idx
--       waitlist_entries.converted_booking_id -> waitlist_entries_converted_booking_id_idx
--       email_log.booking_id            -> email_log_booking_template_key (partial, leading column)
--       admin_users.id                  -> primary key
--   * Row Level Security + grants live in migration 000003.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Shared trigger function: keep updated_at honest.
-- Without this, every writer (webhook, admin action, cron) would have to
-- remember to set updated_at by hand, and one of them eventually forgets.
-- search_path is pinned to empty because the body references no tables.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger function: stamps updated_at = now() on the row being written.';


-- =============================================================================
-- events: a published (or draft) event that can be booked
-- =============================================================================
create table if not exists public.events (
  id                          uuid primary key default gen_random_uuid(),
  slug                        text not null,
  name                        text not null,
  subtitle                    text,
  description                 text,
  venue                       text,
  venue_address               text,
  event_date                  date not null,
  cover_image_url             text,
  first_ticket_price_pence    integer not null,
  sibling_ticket_price_pence  integer not null,
  max_children                integer not null,
  status                      text not null,
  publish_at                  timestamptz,
  close_bookings_at           timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- Named unique constraint: the seed script relies on `on conflict (slug)`.
  constraint events_slug_key unique (slug),

  constraint events_status_check
    check (status in ('draft', 'published', 'closed', 'cancelled')),

  -- Money can be free (0) but never negative.
  constraint events_first_ticket_price_nonneg
    check (first_ticket_price_pence >= 0),
  constraint events_sibling_ticket_price_nonneg
    check (sibling_ticket_price_pence >= 0),

  -- 0 is allowed so an admin can freeze sales without changing status;
  -- the capacity function then answers every request with capacity_exceeded.
  constraint events_max_children_nonneg
    check (max_children >= 0)
);

comment on table public.events is
  'A bookable event (e.g. Studio Stars). Public can read rows where status = ''published''; everything else is admin / service_role only.';
comment on column public.events.slug is
  'URL-safe unique identifier, e.g. studio-stars-2026-12. Seed script upserts on this.';
comment on column public.events.description is
  'Long-form copy, markdown or plain text. Nullable: page copy may live in code until an admin editor exists.';
comment on column public.events.first_ticket_price_pence is
  'Price of the first child on a booking, in pence (10000 = GBP 100). The server recomputes totals from this; the client price is never trusted.';
comment on column public.events.sibling_ticket_price_pence is
  'Price of every additional child on the same booking, in pence (8000 = GBP 80).';
comment on column public.events.max_children is
  'Total child capacity across all bookings. create_booking_with_children counts confirmed children + live pending holds against this.';
comment on column public.events.status is
  'draft | published | closed | cancelled. Only ''published'' is bookable and publicly visible.';
comment on column public.events.publish_at is
  'Optional scheduled-publish time. NOT enforced by the database or the booking function; a job/admin action must flip status.';
comment on column public.events.close_bookings_at is
  'Optional auto-close time. NOT enforced by the database or the booking function; a job/admin action must flip status to closed.';


-- =============================================================================
-- bookings: one row per parent transaction
-- =============================================================================
create table if not exists public.bookings (
  id                          uuid primary key default gen_random_uuid(),
  -- restrict: you cannot delete an event that has bookings. Cancel it instead.
  event_id                    uuid not null references public.events (id) on delete restrict,
  parent_name                 text not null,
  parent_email                text not null,
  parent_phone                text not null,
  time_window                 text not null,
  attendance                  text not null,
  child_count                 integer not null,
  subtotal_pence              integer not null,
  currency                    text not null default 'GBP',
  status                      text not null,
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  terms_version               text not null,
  agreed_to_terms_at          timestamptz not null,
  notes                       text,
  internal_notes              text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  confirmed_at                timestamptz,
  cancelled_at                timestamptz,
  expires_at                  timestamptz not null,

  -- Nullable unique: Postgres treats NULLs as distinct, so many bookings can
  -- have no Stripe ids yet, but a given Stripe id can map to only one booking.
  constraint bookings_stripe_checkout_session_id_key unique (stripe_checkout_session_id),
  constraint bookings_stripe_payment_intent_id_key unique (stripe_payment_intent_id),

  constraint bookings_status_check
    check (status in ('pending_payment', 'confirmed', 'cancelled', 'refunded', 'expired')),
  constraint bookings_time_window_check
    check (time_window in ('morning', 'midday', 'afternoon', 'any')),
  constraint bookings_attendance_check
    check (attendance in ('stay', 'drop')),
  -- Upper bound of 10 mirrors the booking form and the capacity function.
  constraint bookings_child_count_check
    check (child_count between 1 and 10),
  constraint bookings_subtotal_nonneg
    check (subtotal_pence >= 0)
);

comment on table public.bookings is
  'One row per parent transaction. Created as pending_payment by create_booking_with_children, confirmed by the Stripe webhook. No public access; admin read via RLS, writes via service_role.';
comment on column public.bookings.parent_phone is
  'Required for bookings (day-of contact). Contrast with waitlist_entries.parent_phone, which is optional.';
comment on column public.bookings.time_window is
  'Parent''s preferred arrival window: morning | midday | afternoon | any. Admin assigns the actual per-child slot in children.scheduled_at.';
comment on column public.bookings.attendance is
  'stay = parent stays with the child; drop = drop-off. Matters for headcount and safeguarding on the day.';
comment on column public.bookings.child_count is
  'Denormalised count of children rows (1-10). Kept here so the capacity query can sum one table instead of joining.';
comment on column public.bookings.subtotal_pence is
  'Snapshot of the price at booking time, computed server-side from the event prices (first + siblings). Never taken from the client.';
comment on column public.bookings.currency is
  'ISO 4217 code. Defaults to GBP; Stripe Checkout is created in this currency.';
comment on column public.bookings.status is
  'pending_payment -> confirmed (webhook) | expired (cron / checkout.session.expired) ; confirmed -> cancelled | refunded.';
comment on column public.bookings.stripe_checkout_session_id is
  'Stripe cs_... id, set after the Checkout Session is created. Unique so a webhook can look the booking up unambiguously.';
comment on column public.bookings.stripe_payment_intent_id is
  'Stripe pi_... id, set when payment completes. Unique; used to match charge.refunded events back to a booking.';
comment on column public.bookings.terms_version is
  'Version of the terms the parent agreed to (e.g. v1-2026-10), snapshotted from the TERMS_VERSION env var.';
comment on column public.bookings.agreed_to_terms_at is
  'When the parent ticked the terms box. Set by the booking function to now().';
comment on column public.bookings.notes is
  'Free-text notes left by the parent. Parent-visible content.';
comment on column public.bookings.internal_notes is
  'Admin-only notes. Safe from the public because anon/authenticated non-admins have no SELECT on bookings at all (see migration 000003).';
comment on column public.bookings.confirmed_at is
  'Set by the Stripe webhook when payment succeeds.';
comment on column public.bookings.cancelled_at is
  'Set when an admin cancels the booking.';
comment on column public.bookings.expires_at is
  'Hold deadline for pending_payment bookings (now() + 15 minutes, set by the capacity function). A live hold counts toward capacity until this passes; the expiry cron then flips the row to expired. Not meaningful once confirmed.';

-- Capacity count query: sum(child_count) where event_id = ? and status in (...).
-- Also serves plain "bookings for this event" lookups (leading column event_id).
create index if not exists bookings_event_id_status_idx
  on public.bookings (event_id, status);

-- Expiry cron only ever scans overdue pending holds, so index just those rows.
create index if not exists bookings_expires_at_pending_idx
  on public.bookings (expires_at)
  where status = 'pending_payment';


-- =============================================================================
-- children: one row per child on a booking
-- =============================================================================
create table if not exists public.children (
  id            uuid primary key default gen_random_uuid(),
  -- cascade: children are meaningless without their booking.
  booking_id    uuid not null references public.bookings (id) on delete cascade,
  position      integer not null,
  first_name    text not null,
  age           integer not null,
  scheduled_at  timestamptz,
  song_choice   text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Also the index that serves FK lookups on booking_id (leading column).
  constraint children_booking_id_position_key unique (booking_id, position),

  constraint children_position_check check (position >= 1),
  constraint children_age_check check (age between 2 and 16)
);

comment on table public.children is
  'One row per child on a booking. Inserted atomically with the booking by create_booking_with_children.';
comment on column public.children.position is
  '1 = first child (full price), 2+ = siblings (sibling price). Unique per booking.';
comment on column public.children.scheduled_at is
  'The child''s actual slot. Filled in by an admin after confirmation; null until then.';
comment on column public.children.song_choice is
  'The Christmas song the child will sing. Captured later by email, so nullable at booking time.';


-- =============================================================================
-- waitlist_entries: parents who want in when an event is full
-- =============================================================================
create table if not exists public.waitlist_entries (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references public.events (id) on delete cascade,
  parent_name           text not null,
  parent_email          text not null,
  parent_phone          text,
  child_count           integer not null,
  time_window           text,
  notified_at           timestamptz,
  -- No ON DELETE action specified in the spec, so NO ACTION (default) applies.
  -- Bookings are never hard-deleted (they move through statuses), so this is moot.
  converted_booking_id  uuid references public.bookings (id),
  created_at            timestamptz not null default now(),

  constraint waitlist_entries_child_count_check
    check (child_count between 1 and 10),
  -- Same vocabulary as bookings.time_window; null means "no preference given".
  constraint waitlist_entries_time_window_check
    check (time_window is null or time_window in ('morning', 'midday', 'afternoon', 'any'))
);

comment on table public.waitlist_entries is
  'People waiting for a spot on a full event. The public can INSERT (nothing else); admins can read.';
comment on column public.waitlist_entries.notified_at is
  'When the "a spot has opened" email was sent. Null = not yet notified. Public inserts must leave this null (enforced by RLS).';
comment on column public.waitlist_entries.converted_booking_id is
  'Set if the waitlisted parent went on to make a booking. Public inserts must leave this null (enforced by RLS).';

create index if not exists waitlist_entries_event_id_idx
  on public.waitlist_entries (event_id);
create index if not exists waitlist_entries_converted_booking_id_idx
  on public.waitlist_entries (converted_booking_id);


-- =============================================================================
-- email_log: idempotent record of emails sent per booking
-- =============================================================================
create table if not exists public.email_log (
  id                 uuid primary key default gen_random_uuid(),
  -- set null: keep the audit trail of what was sent even if a booking row is ever removed.
  booking_id         uuid references public.bookings (id) on delete set null,
  recipient_email    text not null,
  template           text not null,
  resend_message_id  text,
  sent_at            timestamptz not null default now(),
  error              text,

  constraint email_log_template_check
    check (template in (
      'confirmation', 'reminder_48h', 'day_of', 'thank_you', 'waitlist_opened', 'receipt'
    ))
);

comment on table public.email_log is
  'One row per email attempt. The unique (booking_id, template) index makes sends idempotent: a second attempt at the same template for the same booking violates it.';
comment on column public.email_log.error is
  'Resend error text if the send failed. NOTE: a failed row still occupies the (booking_id, template) slot, so a retry must UPDATE this row rather than insert a new one.';

-- At most one email of each template per booking. Partial because booking_id
-- is nullable (e.g. waitlist emails have no booking) and those rows are exempt.
-- Its leading column (booking_id) also serves FK lookups for the set-null cascade.
create unique index if not exists email_log_booking_template_key
  on public.email_log (booking_id, template)
  where booking_id is not null;


-- =============================================================================
-- stripe_webhook_events: webhook idempotency
-- =============================================================================
create table if not exists public.stripe_webhook_events (
  -- Stripe's own event id (evt_...). Using it as the PK means a replayed event
  -- fails on insert, which is exactly the idempotency check we want.
  id            text primary key,
  type          text not null,
  processed_at  timestamptz not null default now(),
  payload       jsonb
);

comment on table public.stripe_webhook_events is
  'Every Stripe webhook event we have handled, keyed by Stripe event id. Insert first; on a unique violation the event is a replay and is skipped. service_role only.';
comment on column public.stripe_webhook_events.payload is
  'Optional raw event JSON kept for audit/debugging. May contain customer PII.';


-- =============================================================================
-- newsletter_subscribers: Phase 5 placeholder
-- =============================================================================
create table if not exists public.newsletter_subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  resend_contact_id  text,
  source             text,
  consent_at         timestamptz not null default now(),
  unsubscribed_at    timestamptz,

  constraint newsletter_subscribers_email_key unique (email)
);

comment on table public.newsletter_subscribers is
  'Newsletter sign-ups (Phase 5 placeholder). Public can INSERT only. Callers should lower-case and trim email before inserting: the unique constraint is case-sensitive.';
comment on column public.newsletter_subscribers.resend_contact_id is
  'Populated after the row is synced to a Resend audience. Public inserts must leave this null (enforced by RLS).';
comment on column public.newsletter_subscribers.source is
  'Where the sign-up came from: home_hero | booking_confirmation | event_page | footer. Deliberately unconstrained so new placements need no migration.';
comment on column public.newsletter_subscribers.consent_at is
  'When the subscriber consented (UK GDPR / PECR record).';
comment on column public.newsletter_subscribers.unsubscribed_at is
  'Set on unsubscribe. Rows are kept (not deleted) so we do not re-add someone who opted out.';


-- =============================================================================
-- admin_users: allowlist of people who may use /admin
-- =============================================================================
create table if not exists public.admin_users (
  -- Same id as the Supabase Auth user. Deleting the auth user removes admin access.
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  role        text not null,
  created_at  timestamptz not null default now(),

  constraint admin_users_role_check
    check (role in ('owner', 'editor', 'viewer'))
);

comment on table public.admin_users is
  'Allowlist of admins. Being signed in is not enough for /admin: you need a row here. RLS policies use exists(select 1 from admin_users where id = auth.uid()).';
comment on column public.admin_users.email is
  'Copied from auth.users for convenience; not kept in sync automatically.';
comment on column public.admin_users.role is
  'owner | editor | viewer. RLS currently treats every role as read-everything; role-specific write checks are enforced in the admin Server Actions, which use service_role.';


-- =============================================================================
-- updated_at triggers
-- `drop trigger if exists` + `create trigger` keeps this re-runnable on every
-- supported Postgres version.
-- =============================================================================
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

drop trigger if exists children_set_updated_at on public.children;
create trigger children_set_updated_at
  before update on public.children
  for each row execute function public.set_updated_at();
