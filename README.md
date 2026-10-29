# Trybe Website

Fun-filled experiences, activities and events that bring children and families together.

**Domain:** [trybe.uk](https://trybe.uk) (Vercel preview URL during build-out)
**Source designs:** [Trybe Website canvas](https://claude.ai/artifact/UcEAGC9UJadt8zhYJzThNZ)

## Stack

- **Next.js 16** (App Router, Cache Components, Turbopack)
- **React 19**
- **Tailwind v4** with CSS variables mapped from the brand design system
- **TypeScript**
- **Self-hosted fonts** — Bricolage Grotesque + Catamaran via `@fontsource-variable`
- **Supabase** — bookings database + admin auth
- **Resend + React Email** — transactional and marketing email
- **Stripe Checkout** — Studio Stars ticket payments
- **Vercel** — hosting

## Getting started

```bash
npm install
cp .env.example .env.local  # fill in Supabase, Resend, Stripe keys
npm run dev
```

Open http://localhost:3000.

## Project structure

```
app/
  tokens.css                 # Brand design tokens (CSS variables)
  globals.css                # Tailwind entry + base styles
  layout.tsx                 # Root layout with fonts and nav/footer
  page.tsx                   # Home (Phase 2)
  studio-stars/
    layout.tsx               # Scopes [data-theme="studio-stars"] to this route
    page.tsx                 # Studio Stars event page (Phase 2)
    book/page.tsx            # Booking flow (Phase 2 → wired in Phase 3)
components/
  site-nav.tsx               # Top nav (brand-palette on site, yellow/night on Studio Stars)
  site-footer.tsx            # Indigo footer with sitemap + legal
```

## Design system

Everything maps back to `app/tokens.css`. Two palettes:

- **Site-wide** (Trybe Purple, Indigo, Periwinkle, Lavender, Orchid, Blush) — nav, home, generic pages
- **Studio Stars** (Sunshine `#FFD447`, Night `#24123F`) — scoped to `/studio-stars/*` via `data-theme="studio-stars"` on the route layout

Components reach for semantic tokens (`--surface`, `--ink`, `--accent`) so the palette flip is automatic.

See `scratchpad/design-brief.md` for the full component inventory, type scale, and spacing scale.

## Scripts

- `npm run dev` — dev server with Turbopack
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint

## Deployment

Push to a GitHub repo and import on Vercel. Add the env vars from `.env.example` under Vercel → Project → Settings → Environment Variables.

Custom domain (`trybe.uk`) is wired up after the first deploy under Settings → Domains.
