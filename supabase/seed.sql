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
-- description, venue_address and cover_image_url are left null on purpose:
-- no confirmed copy, address or final photo exists yet, and we do not invent facts.
-- Fill them in via the SQL editor (or the admin events editor, once it exists).
--
-- max_children = 60 is a placeholder the owner will adjust to the real capacity.
-- =============================================================================

insert into public.events (
  slug,
  name,
  subtitle,
  venue,
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
  date '2026-12-05',
  10000,  -- GBP 100.00 for the first child
  8000,   -- GBP 80.00 for each additional sibling
  60,
  'published'
)
on conflict (slug) do nothing;
