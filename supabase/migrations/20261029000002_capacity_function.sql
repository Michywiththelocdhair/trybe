-- =============================================================================
-- Migration 000002: capacity-safe booking function
--
-- public.create_booking_with_children(...) is the ONLY supported way to create
-- a booking. In a single transaction it:
--   1. locks the event row (SELECT ... FOR UPDATE) so concurrent bookings for the
--      same event are serialised and each sees the previous one's committed count,
--   2. checks the event is published and has room,
--   3. prices the booking from the EVENT row (never from the client),
--   4. inserts the booking as pending_payment with a 15-minute hold,
--   5. inserts one children row per child.
--
-- Because it is one function call = one transaction, ANY failure (including a
-- CHECK violation on time_window, a null first_name, a non-numeric age...) rolls
-- the whole thing back. You can never end up with a booking and no children.
--
-- Error contract (Server Actions match on these; keep them stable).
-- supabase-js surfaces them as error.code = SQLSTATE, error.message = text:
--   P0001  invalid_child_count   children missing / not an array / not 1..10
--   P0002  event_not_found       no events row with that id
--   P0003  event_not_bookable    event.status is not 'published'
--   P0004  capacity_exceeded     confirmed + live pending + requested > max_children
-- Other failures keep their normal SQLSTATEs, e.g. 23514 (check_violation, such
-- as a bad time_window/attendance/age) and 23502 (not_null_violation).
--
-- Gotcha for SQL/PLpgSQL callers (not for JS callers matching on error.code):
-- P0004 is PL/pgSQL's built-in ASSERT_FAILURE condition, which
-- `EXCEPTION WHEN OTHERS` deliberately does NOT catch. A PL/pgSQL wrapper must
-- name it explicitly, e.g. `WHEN SQLSTATE 'P0004' THEN ...`.
--
-- Known limits, deliberately NOT handled here (per spec):
--   * publish_at / close_bookings_at are not consulted; only events.status is.
--   * The 15-minute hold is hard-coded. BOOKING_HOLD_MINUTES cannot change it
--     unless the caller overwrites bookings.expires_at after the call.
-- =============================================================================

create or replace function public.create_booking_with_children(
  p_event_id uuid,
  p_parent_name text,
  p_parent_email text,
  p_parent_phone text,
  p_time_window text,
  p_attendance text,
  p_terms_version text,
  p_children jsonb -- [{first_name, age}, ...] in position order (first element = position 1)
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
  v_booking bookings;
  v_first_pence integer;
  v_sibling_pence integer;
  v_subtotal_pence integer;
begin
  -- Guard: jsonb_array_length(NULL) is NULL, and NULL comparisons are never true,
  -- so a missing p_children would sail past the range check below. A non-array
  -- would raise an unrelated 22023. Map both to the documented error instead.
  if p_children is null or jsonb_typeof(p_children) <> 'array' then
    raise exception 'invalid_child_count' using errcode = 'P0001';
  end if;

  v_child_count := jsonb_array_length(p_children);
  if v_child_count < 1 or v_child_count > 10 then
    raise exception 'invalid_child_count' using errcode = 'P0001';
  end if;

  -- Lock the event row for the duration of this txn so concurrent bookings
  -- see our committed count. FOR UPDATE serializes bookings per event.
  select * into v_event from events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if v_event.status <> 'published' then
    raise exception 'event_not_bookable' using errcode = 'P0003';
  end if;

  -- Count children already committed (confirmed) + still-live pending holds.
  -- An expired-but-not-yet-swept pending row (expires_at <= now()) does NOT count,
  -- so capacity frees up the instant a hold lapses, even before the cron runs.
  select coalesce(sum(child_count), 0) into v_committed_children
    from bookings
   where event_id = p_event_id
     and (status = 'confirmed'
          or (status = 'pending_payment' and expires_at > now()));

  if v_committed_children + v_child_count > v_event.max_children then
    raise exception 'capacity_exceeded' using errcode = 'P0004';
  end if;

  -- Price from the event, not from the client.
  v_first_pence := v_event.first_ticket_price_pence;
  v_sibling_pence := v_event.sibling_ticket_price_pence;
  v_subtotal_pence := v_first_pence + greatest(v_child_count - 1, 0) * v_sibling_pence;

  insert into bookings (
    event_id, parent_name, parent_email, parent_phone,
    time_window, attendance, child_count, subtotal_pence,
    status, terms_version, agreed_to_terms_at, expires_at
  ) values (
    p_event_id, p_parent_name, p_parent_email, p_parent_phone,
    p_time_window, p_attendance, v_child_count, v_subtotal_pence,
    'pending_payment', p_terms_version, now(), now() + interval '15 minutes'
  )
  returning * into v_booking;

  -- `with ordinality` numbers array elements from 1, giving each child its
  -- position (1 = full price, 2+ = sibling price).
  insert into children (booking_id, position, first_name, age)
  select v_booking.id,
         ord::integer,
         (c->>'first_name')::text,
         (c->>'age')::integer
    from jsonb_array_elements(p_children) with ordinality as t(c, ord);

  return v_booking;
end;
$$;

comment on function public.create_booking_with_children(uuid, text, text, text, text, text, text, jsonb) is
  'Capacity-safe booking creation. Locks the event row, checks status and capacity (confirmed + live pending holds), prices from the event, inserts a pending_payment booking (15 min hold) plus its children atomically. Errors: P0001 invalid_child_count, P0002 event_not_found, P0003 event_not_bookable, P0004 capacity_exceeded. service_role only.';

-- -----------------------------------------------------------------------------
-- Execute privileges: server-side only.
--
-- The spec says `revoke ... from public` + `grant ... to service_role`. On
-- Supabase that alone is NOT enough: the platform's default privileges grant
-- EXECUTE on new public-schema functions directly to the `anon` and
-- `authenticated` roles, and `revoke from public` does not touch those direct
-- grants. Since PostgREST exposes every public function at /rpc/<name>, anyone
-- holding the (public) anon key could otherwise call this SECURITY DEFINER
-- function and fill an event with junk pending holds. So revoke explicitly.
--
-- Full argument list is spelled out so a future overload cannot make these
-- statements ambiguous.
-- -----------------------------------------------------------------------------
revoke all on function public.create_booking_with_children(uuid, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_booking_with_children(uuid, text, text, text, text, text, text, jsonb)
  to service_role;
