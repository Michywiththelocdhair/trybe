-- Christmas Fair 2026: free family tickets and moderated vendor applications.

alter table public.events
  add column if not exists max_family_tickets integer,
  add column if not exists max_vendor_pitches integer;

alter table public.events
  add constraint events_max_family_tickets_nonneg
    check (max_family_tickets is null or max_family_tickets >= 0),
  add constraint events_max_vendor_pitches_nonneg
    check (max_vendor_pitches is null or max_vendor_pitches >= 0);

insert into public.events (
  slug, name, subtitle, description, venue, venue_address, event_date,
  first_ticket_price_pence, sibling_ticket_price_pence, max_children,
  max_family_tickets, max_vendor_pitches, status
) values (
  'christmas-fair-2026', 'Trybe Christmas Fair',
  'A festive day out for the whole family',
  'Free family entry with a ticket. Venue and opening hours to be announced.',
  'Venue TBC', 'Venue and address TBC', date '2026-12-19',
  0, 0, 0, 50, 20, 'published'
)
on conflict (slug) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  description = excluded.description,
  venue = excluded.venue,
  venue_address = excluded.venue_address,
  event_date = excluded.event_date,
  max_family_tickets = coalesce(public.events.max_family_tickets, excluded.max_family_tickets),
  max_vendor_pitches = coalesce(public.events.max_vendor_pitches, excluded.max_vendor_pitches),
  updated_at = now();

create table public.christmas_fair_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_code uuid not null unique default gen_random_uuid(),
  family_name text not null,
  email text not null,
  phone text,
  adult_count integer not null,
  child_count integer not null,
  status text not null default 'confirmed',
  terms_version text not null,
  agreed_to_terms_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,
  reminder_sent_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz not null default now(),
  checked_in_at timestamptz,
  constraint christmas_fair_tickets_attendees_check
    check (adult_count >= 1 and child_count >= 0 and adult_count + child_count between 1 and 8),
  constraint christmas_fair_tickets_status_check
    check (status in ('confirmed', 'cancelled'))
);

create index christmas_fair_tickets_event_status_idx
  on public.christmas_fair_tickets(event_id, status, created_at desc);
create unique index christmas_fair_one_ticket_per_email_idx
  on public.christmas_fair_tickets(event_id, lower(email))
  where status = 'confirmed';

create table public.christmas_fair_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  category text not null,
  description text not null,
  website text,
  needs_power boolean not null default false,
  has_public_liability_insurance boolean not null,
  food_hygiene_rating text,
  status text not null default 'pending',
  terms_version text not null,
  agreed_to_terms_at timestamptz not null default now(),
  applicant_confirmation_sent_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint christmas_fair_vendors_category_check
    check (category in ('kids', 'food', 'crafts', 'other')),
  constraint christmas_fair_vendors_status_check
    check (status in ('pending', 'accepted', 'declined')),
  constraint christmas_fair_vendors_food_rating_check
    check (category <> 'food' or food_hygiene_rating is not null)
);

create index christmas_fair_vendors_event_status_idx
  on public.christmas_fair_vendors(event_id, status, created_at desc);

create trigger christmas_fair_vendors_updated_at
  before update on public.christmas_fair_vendors
  for each row execute function public.set_updated_at();

-- Keep all public writes behind service_role RPCs. Family ticket insertion and
-- capacity checking share a lock on the event row to prevent overselling.
alter table public.christmas_fair_tickets enable row level security;
alter table public.christmas_fair_vendors enable row level security;
revoke all on public.christmas_fair_tickets, public.christmas_fair_vendors from anon, authenticated;
grant select on public.christmas_fair_tickets, public.christmas_fair_vendors to authenticated;
grant select, insert, update, delete on public.christmas_fair_tickets, public.christmas_fair_vendors to service_role;

create policy christmas_fair_tickets_admin_select on public.christmas_fair_tickets
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));
create policy christmas_fair_vendors_admin_select on public.christmas_fair_vendors
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = (select auth.uid())));

create or replace function public.create_christmas_fair_ticket(
  p_family_name text,
  p_email text,
  p_phone text,
  p_adult_count integer,
  p_child_count integer,
  p_terms_version text
)
returns public.christmas_fair_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_ticket christmas_fair_tickets;
  v_count integer;
begin
  select * into v_event from events where slug = 'christmas-fair-2026' for update;
  if not found or v_event.status <> 'published' then
    raise exception 'fair_not_open' using errcode = 'P0002';
  end if;
  if p_adult_count < 1 or p_child_count < 0 or p_adult_count + p_child_count > 8 then
    raise exception 'invalid_attendee_count' using errcode = 'P0001';
  end if;
  if v_event.event_date <= current_date then
    raise exception 'ticket_sales_closed' using errcode = 'P0003';
  end if;
  if exists (
    select 1 from christmas_fair_tickets
     where event_id = v_event.id and lower(email) = lower(trim(p_email)) and status = 'confirmed'
  ) then
    raise exception 'family_ticket_already_exists' using errcode = 'P0005';
  end if;

  select count(*) into v_count from christmas_fair_tickets
   where event_id = v_event.id and status = 'confirmed';
  if v_count >= coalesce(v_event.max_family_tickets, 0) then
    raise exception 'family_capacity_reached' using errcode = 'P0004';
  end if;

  insert into christmas_fair_tickets (
    event_id, family_name, email, phone, adult_count, child_count,
    terms_version, agreed_to_terms_at
  ) values (
    v_event.id, trim(p_family_name), lower(trim(p_email)), nullif(trim(p_phone), ''),
    p_adult_count, p_child_count, p_terms_version, now()
  ) returning * into v_ticket;
  return v_ticket;
end;
$$;

revoke all on function public.create_christmas_fair_ticket(text, text, text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.create_christmas_fair_ticket(text, text, text, integer, integer, text)
  to service_role;

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
  select count(*) into v_families from christmas_fair_tickets where event_id = v_event.id and status = 'confirmed';
  select count(*) into v_vendors from christmas_fair_vendors where event_id = v_event.id and status = 'accepted';
  if p_max_families < v_families or p_max_vendors < v_vendors then
    raise exception 'capacity_below_committed' using errcode = 'P0003';
  end if;
  update events set max_family_tickets = p_max_families, max_vendor_pitches = p_max_vendors where id = v_event.id;
end;
$$;

revoke all on function public.update_christmas_fair_capacities(integer, integer) from public, anon, authenticated;
grant execute on function public.update_christmas_fair_capacities(integer, integer) to service_role;

create or replace function public.set_christmas_fair_vendor_status(p_vendor_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_vendor christmas_fair_vendors%rowtype;
  v_accepted integer;
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'invalid_vendor_status' using errcode = 'P0001';
  end if;
  select * into v_event from events where slug = 'christmas-fair-2026' for update;
  if not found then raise exception 'fair_not_found' using errcode = 'P0002'; end if;
  select * into v_vendor from christmas_fair_vendors where id = p_vendor_id and event_id = v_event.id for update;
  if not found then raise exception 'vendor_not_found' using errcode = 'P0004'; end if;
  if p_status = 'accepted' and v_vendor.status <> 'accepted' then
    select count(*) into v_accepted from christmas_fair_vendors where event_id = v_event.id and status = 'accepted';
    if v_accepted >= coalesce(v_event.max_vendor_pitches, 0) then
      raise exception 'vendor_capacity_reached' using errcode = 'P0003';
    end if;
  end if;
  update christmas_fair_vendors set status = p_status where id = v_vendor.id;
end;
$$;

revoke all on function public.set_christmas_fair_vendor_status(uuid, text) from public, anon, authenticated;
grant execute on function public.set_christmas_fair_vendor_status(uuid, text) to service_role;
