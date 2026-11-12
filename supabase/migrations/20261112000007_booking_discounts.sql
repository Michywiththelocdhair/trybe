-- Stripe promotion codes (e.g. the 10% email-list code) on Studio Stars
-- bookings. subtotal_pence stays the list price; the webhook records what
-- Stripe discounted, so amount paid = subtotal_pence - discount_pence.
alter table public.bookings
  add column if not exists discount_pence integer not null default 0,
  add column if not exists promo_code text;

alter table public.bookings
  drop constraint if exists bookings_discount_range;

alter table public.bookings
  add constraint bookings_discount_range
  check (discount_pence >= 0 and discount_pence <= subtotal_pence);

comment on column public.bookings.discount_pence is
  'Amount Stripe Checkout discounted via a promotion code, recorded by the webhook. Amount paid = subtotal_pence - discount_pence.';
comment on column public.bookings.promo_code is
  'The customer-facing promotion code used at Stripe Checkout, if any.';
