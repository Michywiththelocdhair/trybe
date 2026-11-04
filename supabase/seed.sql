-- =============================================================================
-- Seed: the Studio Stars event
--
-- Idempotent: `on conflict (slug) do nothing` means re-running this never
-- duplicates the event and never overwrites edits made later (price changes,
-- capacity, description). To change a seeded value, edit the row directly.
--
-- Values come from the design brief / phase-3-backend-spec.md:
--   Sat 5 Dec 2026 at The Qube; GBP 100 for the first child, GBP 80 for each
--   sibling (formula: total = 100 + (count - 1) * 80).
--
-- The event has twelve 20-minute sessions between 10am and 2pm, with no gaps.
-- =============================================================================

insert into public.events (
  slug,
  name,
  subtitle,
  venue,
  venue_address,
  event_date,
  first_ticket_price_pence,
  sibling_ticket_price_pence,
  max_children,
  status
) values (
  'studio-stars-2026-12',
  'Studio Stars',
  'Christmas singing experience',
  'The Qube',
  '168 Dukes Road, London, W3 0SL',
  date '2026-12-05',
  10000,  -- GBP 100.00 for the first child
  8000,   -- GBP 80.00 for each additional sibling
  12,
  'published'
)
on conflict (slug) do nothing;

insert into public.events (
  slug, name, subtitle, description, venue, venue_address, event_date,
  first_ticket_price_pence, sibling_ticket_price_pence, max_children,
  max_family_tickets, max_vendor_pitches, status
) values (
  'christmas-fair-2026',
  'Trybe Christmas Fair',
  'A festive day out for the whole family',
  'Free family entry with a ticket. Venue and opening hours to be announced.',
  'Venue TBC',
  'Venue and address TBC',
  date '2026-12-19',
  0, 0, 0, 50, 20, 'published'
)
on conflict (slug) do nothing;
