-- Christmas Fair 2026, round two: confirmed venue, paid family entry (a
-- donation to Acres), and a vendor flow of apply -> approve -> pay.
--
--   * Family tickets are held as `pending_payment` while the family is in
--     Stripe Checkout and become `confirmed` from the Stripe webhook. Entry is a
--     minimum donation of £2 per adult and £1 per child, plus an optional extra
--     donation. Tickets issued before this migration were free and stay valid.
--   * Vendors apply (with photos and a logo in Supabase Storage). An admin
--     approves or declines. Approval fixes the table price (£25 for the first
--     10 tables, £35 after) and opens a 3-day window to pay through the site.
--   * email_log now records every email the site sends (with a copy of the
--     HTML), and email_templates holds admin edits to the fair emails.

-- ---------------------------------------------------------------------------
-- Event details
-- ---------------------------------------------------------------------------
update public.events set
  subtitle = 'A festive day out for the whole family',
  description = 'Saturday 19 December, 12–5pm at Acres, 12 Acklam Road, London W10 5QZ. Entry by donation (£2 adults, £1 children), all going to Acres'' Christmas Day dinner.',
  venue = 'Acres',
  venue_address = '12 Acklam Road, London W10 5QZ',
  max_family_tickets = 100,
  max_vendor_pitches = 25,
  updated_at = now()
where slug = 'christmas-fair-2026';

-- ---------------------------------------------------------------------------
-- Family tickets: payment columns and statuses
-- ---------------------------------------------------------------------------
alter table public.christmas_fair_tickets
  add column if not exists minimum_donation_pence integer not null default 0,
  add column if not exists extra_donation_pence integer not null default 0,
  add column if not exists amount_paid_pence integer,
  add column if not exists stripe_checkout_session_id text unique,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists expires_at timestamptz,
  add column if not exists paid_at timestamptz;

alter table public.christmas_fair_tickets
  drop constraint if exists christmas_fair_tickets_status_check;
alter table public.christmas_fair_tickets
  add constraint christmas_fair_tickets_status_check
  check (status in ('pending_payment', 'confirmed', 'expired', 'cancelled', 'refunded'));

alter table public.christmas_fair_tickets
  drop constraint if exists christmas_fair_tickets_donation_check;
alter table public.christmas_fair_tickets
  add constraint christmas_fair_tickets_donation_check
  check (minimum_donation_pence >= 0 and extra_donation_pence between 0 and 50000);

create index if not exists christmas_fair_tickets_payment_intent_idx
  on public.christmas_fair_tickets(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- The free-ticket RPC is replaced by a paid hold.
drop function if exists public.create_christmas_fair_ticket(text, text, text, integer, integer, text);

create or replace function public.create_christmas_fair_ticket_hold(
  p_family_name text,
  p_email text,
  p_phone text,
  p_adult_count integer,
  p_child_count integer,
  p_extra_donation_pence integer,
  p_terms_version text,
  p_hold_minutes integer
)
returns public.christmas_fair_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_ticket christmas_fair_tickets;
  v_taken integer;
  v_email text := lower(trim(p_email));
begin
  select * into v_event from events where slug = 'christmas-fair-2026' for update;
  if not found or v_event.status <> 'published' then
    raise exception 'fair_not_open' using errcode = 'P0002';
  end if;
  if p_adult_count < 1 or p_child_count < 0 or p_adult_count + p_child_count > 8 then
    raise exception 'invalid_attendee_count' using errcode = 'P0001';
  end if;
  if p_extra_donation_pence < 0 or p_extra_donation_pence > 50000 then
    raise exception 'invalid_donation' using errcode = 'P0006';
  end if;
  if v_event.event_date <= current_date then
    raise exception 'ticket_sales_closed' using errcode = 'P0003';
  end if;
  if exists (
    select 1 from christmas_fair_tickets
     where event_id = v_event.id and lower(email) = v_email and status = 'confirmed'
  ) then
    raise exception 'family_ticket_already_exists' using errcode = 'P0005';
  end if;

  -- A family retrying checkout replaces its own earlier, unpaid hold.
  update christmas_fair_tickets set status = 'expired'
   where event_id = v_event.id and lower(email) = v_email and status = 'pending_payment';

  select count(*) into v_taken from christmas_fair_tickets
   where event_id = v_event.id
     and (status = 'confirmed' or (status = 'pending_payment' and expires_at > now()));
  if v_taken >= coalesce(v_event.max_family_tickets, 0) then
    raise exception 'family_capacity_reached' using errcode = 'P0004';
  end if;

  insert into christmas_fair_tickets (
    event_id, family_name, email, phone, adult_count, child_count, status,
    minimum_donation_pence, extra_donation_pence, expires_at,
    terms_version, agreed_to_terms_at
  ) values (
    v_event.id, trim(p_family_name), v_email, nullif(trim(p_phone), ''),
    p_adult_count, p_child_count, 'pending_payment',
    p_adult_count * 200 + p_child_count * 100, p_extra_donation_pence,
    now() + make_interval(mins => greatest(p_hold_minutes, 1)),
    p_terms_version, now()
  ) returning * into v_ticket;
  return v_ticket;
end;
$$;

revoke all on function public.create_christmas_fair_ticket_hold(text, text, text, integer, integer, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_christmas_fair_ticket_hold(text, text, text, integer, integer, integer, text, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Vendors: approval, payment and uploads
-- ---------------------------------------------------------------------------
alter table public.christmas_fair_vendors
  add column if not exists access_token uuid not null default gen_random_uuid(),
  add column if not exists table_price_pence integer,
  add column if not exists approved_at timestamptz,
  add column if not exists payment_due_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists amount_paid_pence integer,
  add column if not exists stripe_checkout_session_id text unique,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists logo_path text,
  add column if not exists photo_paths text[] not null default '{}',
  add column if not exists uploads_completed_at timestamptz,
  add column if not exists decision_email_sent_at timestamptz,
  add column if not exists payment_confirmation_sent_at timestamptz;

create unique index if not exists christmas_fair_vendors_access_token_key
  on public.christmas_fair_vendors(access_token);
create index if not exists christmas_fair_vendors_payment_intent_idx
  on public.christmas_fair_vendors(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Food hygiene ratings are no longer collected.
alter table public.christmas_fair_vendors
  drop constraint if exists christmas_fair_vendors_food_rating_check;

-- Earlier "accepted" applicants never received a payment link; they become
-- approved-awaiting-payment with no deadline, so an admin can send the link.
alter table public.christmas_fair_vendors
  drop constraint if exists christmas_fair_vendors_status_check;
update public.christmas_fair_vendors set status = 'approved' where status = 'accepted';
-- Earlier decisions were communicated by hand; don't email them again.
update public.christmas_fair_vendors set decision_email_sent_at = coalesce(updated_at, now())
 where status = 'declined' and decision_email_sent_at is null;
alter table public.christmas_fair_vendors
  add constraint christmas_fair_vendors_status_check
  check (status in ('pending', 'approved', 'paid', 'declined', 'expired', 'refunded'));

alter table public.christmas_fair_vendors
  drop constraint if exists christmas_fair_vendors_price_check;
alter table public.christmas_fair_vendors
  add constraint christmas_fair_vendors_price_check
  check (table_price_pence is null or table_price_pence > 0);

-- A table is "held" when it is paid for, or approved with time left to pay.
create or replace function public.christmas_fair_vendor_holds_table(v christmas_fair_vendors)
returns boolean
language sql
stable
set search_path = public
as $$
  select v.status = 'paid' or (v.status = 'approved' and v.payment_due_at > now());
$$;

drop function if exists public.set_christmas_fair_vendor_status(uuid, text);

create or replace function public.approve_christmas_fair_vendor(
  p_vendor_id uuid,
  p_payment_days integer
)
returns public.christmas_fair_vendors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_vendor christmas_fair_vendors%rowtype;
  v_held integer;
  v_early integer;
  v_price integer;
  v_due timestamptz;
begin
  select * into v_event from events where slug = 'christmas-fair-2026' for update;
  if not found then raise exception 'fair_not_found' using errcode = 'P0002'; end if;
  select * into v_vendor from christmas_fair_vendors
   where id = p_vendor_id and event_id = v_event.id for update;
  if not found then raise exception 'vendor_not_found' using errcode = 'P0004'; end if;
  if v_vendor.status not in ('pending', 'approved', 'expired', 'declined') then
    raise exception 'vendor_not_approvable' using errcode = 'P0001';
  end if;

  select count(*) into v_held from christmas_fair_vendors v
   where v.event_id = v_event.id and v.id <> v_vendor.id
     and christmas_fair_vendor_holds_table(v);
  if v_held >= coalesce(v_event.max_vendor_pitches, 0) then
    raise exception 'vendor_capacity_reached' using errcode = 'P0003';
  end if;

  -- Re-sending an active approval keeps the price that was offered.
  if christmas_fair_vendor_holds_table(v_vendor) and v_vendor.table_price_pence is not null then
    v_price := v_vendor.table_price_pence;
  else
    select count(*) into v_early from christmas_fair_vendors v
     where v.event_id = v_event.id and v.id <> v_vendor.id
       and v.table_price_pence = 2500 and christmas_fair_vendor_holds_table(v);
    v_price := case when v_early < 10 then 2500 else 3500 end;
  end if;

  v_due := least(
    now() + make_interval(days => greatest(p_payment_days, 1)),
    (v_event.event_date::timestamp at time zone 'Europe/London')
  );

  update christmas_fair_vendors set
    status = 'approved',
    table_price_pence = v_price,
    approved_at = now(),
    payment_due_at = v_due,
    decision_email_sent_at = null
  where id = v_vendor.id
  returning * into v_vendor;
  return v_vendor;
end;
$$;

create or replace function public.decline_christmas_fair_vendor(p_vendor_id uuid)
returns public.christmas_fair_vendors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor christmas_fair_vendors%rowtype;
begin
  update christmas_fair_vendors set
    status = 'declined',
    payment_due_at = null,
    decision_email_sent_at = null
  where id = p_vendor_id and status in ('pending', 'approved', 'expired')
  returning * into v_vendor;
  if not found then raise exception 'vendor_not_declinable' using errcode = 'P0001'; end if;
  return v_vendor;
end;
$$;

revoke all on function public.christmas_fair_vendor_holds_table(christmas_fair_vendors) from public, anon, authenticated;
grant execute on function public.christmas_fair_vendor_holds_table(christmas_fair_vendors) to service_role;
revoke all on function public.approve_christmas_fair_vendor(uuid, integer) from public, anon, authenticated;
grant execute on function public.approve_christmas_fair_vendor(uuid, integer) to service_role;
revoke all on function public.decline_christmas_fair_vendor(uuid) from public, anon, authenticated;
grant execute on function public.decline_christmas_fair_vendor(uuid) to service_role;

-- Capacity changes must respect paid / held places under the new statuses.
create or replace function public.update_christmas_fair_capacities(
  p_max_families integer,
  p_max_vendors integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_families integer;
  v_vendors integer;
begin
  if p_max_families < 0 or p_max_vendors < 0 then
    raise exception 'invalid_capacity' using errcode = 'P0001';
  end if;
  select * into v_event from events where slug = 'christmas-fair-2026' for update;
  if not found then raise exception 'fair_not_found' using errcode = 'P0002'; end if;
  select count(*) into v_families from christmas_fair_tickets
   where event_id = v_event.id and status = 'confirmed';
  select count(*) into v_vendors from christmas_fair_vendors v
   where v.event_id = v_event.id and christmas_fair_vendor_holds_table(v);
  if p_max_families < v_families or p_max_vendors < v_vendors then
    raise exception 'capacity_below_committed' using errcode = 'P0003';
  end if;
  update events set max_family_tickets = p_max_families, max_vendor_pitches = p_max_vendors where id = v_event.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vendor uploads (private bucket; admins view through signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'christmas-fair-vendors', 'christmas-fair-vendors', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Email log: every email the site sends, with a copy of what was sent
-- ---------------------------------------------------------------------------
alter table public.email_log
  add column if not exists subject text,
  add column if not exists html text,
  add column if not exists related_kind text,
  add column if not exists related_id uuid;

alter table public.email_log
  drop constraint if exists email_log_template_check;
alter table public.email_log
  add constraint email_log_template_check
  check (template in (
    'confirmation', 'reminder_48h', 'day_of', 'thank_you',
    'waitlist_opened', 'receipt', 'admin_booking',
    'fair_ticket_confirmation', 'fair_ticket_reminder',
    'fair_vendor_received', 'fair_vendor_approved', 'fair_vendor_declined',
    'fair_vendor_paid', 'fair_admin_notice', 'other'
  ));

create index if not exists email_log_sent_at_idx on public.email_log(sent_at desc);
create index if not exists email_log_related_idx on public.email_log(related_kind, related_id);

-- ---------------------------------------------------------------------------
-- Editable email copy. A row exists only once an admin has edited a template;
-- otherwise the default copy in lib/email/editable-templates.ts is used.
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  key text primary key,
  subject text not null,
  heading text not null,
  body text not null,
  button_label text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_users(id) on delete set null,
  constraint email_templates_key_check check (key in (
    'fair_ticket_confirmation', 'fair_ticket_reminder',
    'fair_vendor_received', 'fair_vendor_approved', 'fair_vendor_declined',
    'fair_vendor_paid'
  )),
  constraint email_templates_lengths_check check (
    char_length(subject) between 1 and 200
    and char_length(heading) between 1 and 200
    and char_length(body) between 1 and 8000
    and (button_label is null or char_length(button_label) between 1 and 60)
  )
);

alter table public.email_templates enable row level security;
revoke all on public.email_templates from anon, authenticated;
grant select on public.email_templates to authenticated;
grant select, insert, update, delete on public.email_templates to service_role;

drop policy if exists email_templates_admin_select on public.email_templates;
create policy email_templates_admin_select on public.email_templates
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));
