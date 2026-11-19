-- Christmas Fair: family tickets stay on sale on the day of the fair (until
-- they sell out). Previously online sales closed at midnight the night before.
-- Only the date check changes; the function is otherwise identical to 000009.

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
  -- Tickets stay on sale through the day of the fair, until they sell out.
  if v_event.event_date < (now() at time zone 'Europe/London')::date then
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
