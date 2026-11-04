-- Studio Stars: exact 20-minute starts from 10:00 to 14:00, with no gaps.
-- Existing bookings keep their original time_window value and have no exact
-- start until one is assigned; new bookings reserve every child's slot here.

alter table public.bookings
  add column if not exists session_start_time time;

alter table public.bookings
  add constraint bookings_session_start_time_check
  check (
    session_start_time is null
    or (
      session_start_time >= time '10:00'
      and session_start_time < time '14:00'
      and extract(second from session_start_time) = 0
      and mod(extract(hour from session_start_time) * 60 + extract(minute from session_start_time) - 600, 20) = 0
    )
  );

comment on column public.bookings.session_start_time is
  'Parent-selected first child start time in Europe/London local time. Siblings are assigned consecutive 20-minute slots.';

comment on column public.children.scheduled_at is
  'Reserved exact 20-minute session start. Set atomically during booking; sibling sessions are consecutive.';

-- The initial seed capacity was a placeholder. This event has twelve
-- consecutive 20-minute child sessions from 10:00 to 14:00.
update public.events
   set max_children = 12,
       venue_address = '168 Dukes Road, London, W3 0SL'
 where slug = 'studio-stars-2026-12';

drop function if exists public.create_booking_with_children(uuid, text, text, text, text, text, text, jsonb);

create function public.create_booking_with_children(
  p_event_id uuid,
  p_parent_name text,
  p_parent_email text,
  p_parent_phone text,
  p_time_window text,
  p_session_start_time time,
  p_attendance text,
  p_terms_version text,
  p_children jsonb
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_child_count integer;
  v_committed_children integer;
  v_start_minute integer;
  v_booking bookings;
  v_first_pence integer;
  v_sibling_pence integer;
  v_subtotal_pence integer;
begin
  if p_children is null or jsonb_typeof(p_children) <> 'array' then
    raise exception 'invalid_child_count' using errcode = 'P0001';
  end if;

  v_child_count := jsonb_array_length(p_children);
  if v_child_count < 1 or v_child_count > 10 then
    raise exception 'invalid_child_count' using errcode = 'P0001';
  end if;

  if p_session_start_time is null then
    raise exception 'invalid_session_start_time' using errcode = 'P0006';
  end if;
  v_start_minute := extract(hour from p_session_start_time)::integer * 60
                    + extract(minute from p_session_start_time)::integer;
  if p_session_start_time < time '10:00'
     or p_session_start_time >= time '14:00'
     or extract(second from p_session_start_time) <> 0
     or mod(v_start_minute - 600, 20) <> 0
     or v_start_minute + (v_child_count * 20) > 840 then
    raise exception 'invalid_session_start_time' using errcode = 'P0006';
  end if;

  -- Serialise all booking attempts for this event before checking capacity
  -- and exact child slots, so simultaneous checkouts cannot reserve the same slot.
  select * into v_event from events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if v_event.status <> 'published' then
    raise exception 'event_not_bookable' using errcode = 'P0003';
  end if;

  select coalesce(sum(child_count), 0) into v_committed_children
    from bookings
   where event_id = p_event_id
     and (status = 'confirmed'
          or (status = 'pending_payment' and expires_at > now()));

  if v_committed_children + v_child_count > v_event.max_children then
    raise exception 'capacity_exceeded' using errcode = 'P0004';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_children) with ordinality as requested(child, position)
      join children reserved
        on reserved.scheduled_at = (
          (v_event.event_date + p_session_start_time
            + ((requested.position::integer - 1) * interval '20 minutes'))
          at time zone 'Europe/London'
        )
      join bookings existing on existing.id = reserved.booking_id
     where existing.event_id = p_event_id
       and (existing.status = 'confirmed'
            or (existing.status = 'pending_payment' and existing.expires_at > now()))
  ) then
    raise exception 'session_time_unavailable' using errcode = 'P0005';
  end if;

  v_first_pence := v_event.first_ticket_price_pence;
  v_sibling_pence := v_event.sibling_ticket_price_pence;
  v_subtotal_pence := v_first_pence + greatest(v_child_count - 1, 0) * v_sibling_pence;

  insert into bookings (
    event_id, parent_name, parent_email, parent_phone,
    time_window, session_start_time, attendance, child_count, subtotal_pence,
    status, terms_version, agreed_to_terms_at, expires_at
  ) values (
    p_event_id, p_parent_name, p_parent_email, p_parent_phone,
    coalesce(p_time_window, 'any'), p_session_start_time, p_attendance,
    v_child_count, v_subtotal_pence, 'pending_payment', p_terms_version,
    now(), now() + interval '15 minutes'
  ) returning * into v_booking;

  insert into children (booking_id, position, first_name, age, scheduled_at)
  select v_booking.id,
         requested.position::integer,
         (requested.child->>'first_name')::text,
         (requested.child->>'age')::integer,
         (
           (v_event.event_date + p_session_start_time
             + ((requested.position::integer - 1) * interval '20 minutes'))
           at time zone 'Europe/London'
         )
    from jsonb_array_elements(p_children) with ordinality as requested(child, position);

  return v_booking;
end;
$$;

comment on function public.create_booking_with_children(uuid, text, text, text, text, time, text, text, jsonb) is
  'Creates a capacity-safe booking and reserves each child a consecutive exact 20-minute session. Serializes capacity and slot checks per event.';

revoke all on function public.create_booking_with_children(uuid, text, text, text, text, time, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_booking_with_children(uuid, text, text, text, text, time, text, text, jsonb)
  to service_role;
