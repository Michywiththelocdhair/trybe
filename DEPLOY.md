# Trybe — Deploy Checklist

Everything you need to take the site from local dev to production at **trybe.uk**.

---

## 1. Supabase

### Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project (region: London / `eu-west-2` for lowest latency to UK users).
2. Copy three values from **Project Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — the project URL (e.g. `https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the public/anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — the secret service-role key (**never** expose this client-side)

### Run migrations

Execute the three migration files **in order** in the SQL Editor (or via the Supabase CLI):

```
supabase/migrations/20261029000001_initial_schema.sql
supabase/migrations/20261029000002_capacity_function.sql
supabase/migrations/20261029000003_rls_policies.sql
```

These create:

| Table | Purpose |
|---|---|
| `events` | Bookable events (Studio Stars, etc.) |
| `bookings` | One row per parent transaction |
| `children` | One row per child on a booking |
| `waitlist_entries` | Public waitlist sign-ups |
| `email_log` | Idempotent email send log |
| `stripe_webhook_events` | Webhook deduplication |
| `newsletter_subscribers` | Newsletter sign-ups |
| `admin_users` | Admin allowlist (linked to Supabase Auth) |

Plus the `create_booking_with_children()` RPC function (capacity-safe, service_role only).

RLS is enabled on every table. Policies enforce:
- Public: read published events, insert waitlist + newsletter only
- Admin (authenticated + `admin_users` row): read bookings, children, email_log, waitlist, newsletter
- `service_role`: full access (webhooks, crons, server actions)

### Seed the Studio Stars event

```
supabase/seed.sql
```

This inserts the Studio Stars event (Sat 5 Dec 2026, The Qube, £100/£80). Idempotent via `ON CONFLICT (slug) DO NOTHING`.

After seeding, update these nullable columns in the SQL Editor:
- `description` — event copy
- `venue_address` — full address
- `cover_image_url` — event photo URL
- `max_children` — real capacity (default is 60 placeholder)

### Create an admin user

1. In Supabase **Authentication > Users**, create a user with your email (or sign up through the /admin/login page).
2. Copy the user's UUID from the Auth dashboard.
3. In the SQL Editor:

```sql
INSERT INTO public.admin_users (id, email, role)
VALUES ('YOUR-AUTH-USER-UUID', 'your@email.com', 'owner');
```

---

## 2. Stripe

### Create products

In [Stripe Dashboard](https://dashboard.stripe.com):

1. The app creates Checkout Sessions with inline `line_items` (price_data), so you do **not** need to create Products/Prices in the dashboard. Pricing is controlled by the `events` table (`first_ticket_price_pence`, `sibling_ticket_price_pence`).

### Set up the webhook

1. Go to **Developers > Webhooks > Add endpoint**
2. Endpoint URL: `https://trybe.uk/api/webhooks/stripe`
3. Subscribe to these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
   - `charge.refunded`
4. Copy the **Signing secret** (`whsec_...`) — this becomes `STRIPE_WEBHOOK_SECRET`.

### Get API keys

From **Developers > API keys**:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — publishable key (`pk_live_...`)
- `STRIPE_SECRET_KEY` — secret key (`sk_live_...`)

**Important**: The app pins Stripe API version `2026-09-30.endive`. Do not change this without retesting the webhook payload shape.

---

## 3. Resend

1. Create an account at [resend.com](https://resend.com).
2. **Verify the domain** `trybe.uk` (add the DNS records Resend provides).
3. Copy `RESEND_API_KEY` from the API Keys page.
4. Create an **Audience** (e.g. "Trybe Newsletter"). Copy its ID as `RESEND_AUDIENCE_ID`.
5. The default from address is `Trybe <hello@trybe.uk>` (set via `RESEND_FROM_EMAIL`).

---

## 4. Vercel

### Connect the repo

1. Import the GitHub repo: `Michywiththelocdhair/trybe.git`
2. Framework preset: **Next.js** (auto-detected)
3. Build command: `npm run build` (default)
4. Output directory: `.next` (default)

### Environment variables

Set all of these in **Settings > Environment Variables** for Production (and Preview if desired):

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (server only) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `RESEND_API_KEY` | Yes | Resend API key |
| `RESEND_FROM_EMAIL` | No | Default: `Trybe <hello@trybe.uk>` |
| `RESEND_AUDIENCE_ID` | Yes | Resend audience ID for newsletter |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://trybe.uk` |
| `BOOKING_HOLD_MINUTES` | No | Default: `15` — how long a pending booking holds capacity |
| `TERMS_VERSION` | No | Default: `v1-2026-10` — bump when T&Cs change |
| `CRON_SECRET` | Yes | Shared secret for cron auth. Generate: `openssl rand -hex 32` |

### Cron jobs

Vercel reads `vercel.json` and registers these automatically:

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/expire-bookings` | Every 5 min (`*/5 * * * *`) | Expire pending bookings past their hold window, cancel their Stripe sessions |
| `/api/cron/send-reminders` | Daily 07:00 UTC (`0 7 * * *`) | Send reminder (48h), day-of, and thank-you emails |

Both crons authenticate via `Authorization: Bearer ${CRON_SECRET}`. Vercel injects this automatically when `CRON_SECRET` is set.

### Custom domain

1. In Vercel **Settings > Domains**, add `trybe.uk` and `www.trybe.uk`.
2. Vercel provides DNS records (A/CNAME) to configure at your registrar.

---

## 5. DNS

At your domain registrar for `trybe.uk`:

1. Add the A/CNAME records Vercel provides for the apex domain and www.
2. Add the DNS records Resend provides for email verification (SPF, DKIM, DMARC).
3. Wait for propagation (usually < 1 hour, can take up to 48h).

---

## 6. Post-deploy Verification

Run through each item after the first production deploy:

### Booking flow
- [ ] Visit `https://trybe.uk/studio-stars` — page loads, pricing shows £100/£80
- [ ] Click "Book Now", fill in the form, submit
- [ ] Stripe Checkout opens with the correct amount
- [ ] Complete payment with a test card (if still on test keys) or a real card
- [ ] Booking confirmation page shows
- [ ] Confirmation email + receipt email arrive
- [ ] Check Supabase: booking row is `confirmed`, children rows exist

### Webhook
- [ ] In Stripe Dashboard > Webhooks, verify the endpoint shows successful deliveries
- [ ] Check `stripe_webhook_events` table has an `evt_...` row

### Cron jobs
- [ ] In Vercel **Settings > Crons**, verify both jobs are registered
- [ ] Check Vercel function logs for `/api/cron/expire-bookings` and `/api/cron/send-reminders`
- [ ] Create a test booking and let it expire — confirm it flips to `expired`

### Email reminders
- [ ] Create a confirmed booking for an event 2 days from now — 48h reminder should send at 07:00 UTC
- [ ] Create a confirmed booking for today's event — day-of email should send at 07:00 UTC
- [ ] After the event date passes — thank-you email should send at 07:00 UTC the next day

### Newsletter
- [ ] Submit the newsletter form in the footer with a test email
- [ ] Welcome email arrives
- [ ] Check Resend audience — contact appears

### SEO & social
- [ ] Visit `https://trybe.uk/sitemap.xml` — 3 URLs listed
- [ ] Visit `https://trybe.uk/robots.txt` — admin/api/preview blocked
- [ ] Share `https://trybe.uk` on Twitter/Slack/iMessage — OG image renders (night bg, "Trybe")
- [ ] Share `https://trybe.uk/studio-stars` — OG image renders (indigo bg, event details)
- [ ] Test Studio Stars page with [Google Rich Results Test](https://search.google.com/test/rich-results) — Event structured data validates

### Performance
- [ ] Run [Lighthouse](https://pagespeed.web.dev/) on `/` and `/studio-stars`
- [ ] Target: Performance > 90, Accessibility > 95, Best Practices > 95, SEO = 100

### Security spot-checks
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not in the client bundle (`curl https://trybe.uk | grep -i service_role` returns nothing)
- [ ] Direct Supabase API access respects RLS: `curl <supabase_url>/rest/v1/bookings -H "apikey: <anon_key>"` returns empty or 403
- [ ] `/api/cron/expire-bookings` returns 401 without the correct Bearer token
- [ ] The booking RPC `create_booking_with_children` is not callable with the anon key

---

## 7. Going Live Checklist

- [ ] Switch Stripe from test keys to live keys
- [ ] Update the Stripe webhook endpoint URL if it was pointing to a preview URL
- [ ] Verify Resend domain is fully verified (SPF, DKIM, DMARC all green)
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://trybe.uk` (not a preview URL)
- [ ] Update `max_children` in the `events` table to the real venue capacity
- [ ] Fill in event `description`, `venue_address`, and `cover_image_url`
- [ ] Replace placeholder content in the footer: phone number, Instagram link, Facebook link
- [ ] Create the legal pages: `/privacy`, `/terms`, `/safeguarding`
- [ ] Remove `[TBC]` labels from legal links in `components/site-footer.tsx`
- [ ] Submit sitemap to Google Search Console: `https://trybe.uk/sitemap.xml`
