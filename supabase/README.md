# Supabase: database layer

Schema, capacity-safe booking function, Row Level Security and seed data for the Trybe booking backend.

```
supabase/
  migrations/
    20261029000001_initial_schema.sql    tables, constraints, indexes, updated_at triggers
    20261029000002_capacity_function.sql create_booking_with_children() + execute privileges
    20261029000003_rls_policies.sql      table GRANTs + RLS policies
  seed.sql                               the Studio Stars event (idempotent)
```

Migrations run in plain numerical order of filename (`...0001`, then `...0002`, then `...0003`). Every statement is idempotent, so re-running against a dirty database is safe.

## What the schema gives you

Tables: `events`, `bookings`, `children`, `waitlist_entries`, `email_log`, `stripe_webhook_events`, `newsletter_subscribers`, `admin_users`.

Function: `public.create_booking_with_children(...)`. The only supported way to create a booking. It locks the event row, checks capacity (confirmed children plus unexpired pending holds), prices the booking from the event, and inserts the booking and its children in one transaction. It is callable by `service_role` only.

| Error code | Message | Meaning |
|---|---|---|
| `P0001` | `invalid_child_count` | children missing, not an array, or not 1 to 10 |
| `P0002` | `event_not_found` | no event with that id |
| `P0003` | `event_not_bookable` | event status is not `published` |
| `P0004` | `capacity_exceeded` | not enough places left |

Other failures keep their normal Postgres codes, for example `23514` for a bad `time_window` or child `age`.

## 1. Install the Supabase CLI

Pick one:

```bash
brew install supabase/tap/supabase     # macOS / Linux with Homebrew
npm install --save-dev supabase        # per-project, then run it as `npx supabase ...`
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git   # Windows, first time only
scoop install supabase
```

Check it works with `supabase --version`. Full install options: <https://supabase.com/docs/reference/cli/getting-started>

## 2. Link to your hosted project

Create a project at <https://supabase.com/dashboard>, then:

```bash
supabase login
supabase init                              # only if supabase/config.toml does not exist yet
supabase link --project-ref <your-project-ref>
```

`supabase init` writes `supabase/config.toml` and leaves the existing `migrations/` and `seed.sql` untouched. The project ref is the id in your dashboard URL (`https://supabase.com/dashboard/project/<project-ref>`). You will be asked for the database password you set when creating the project.

## 3. Apply the migrations

```bash
supabase db push --dry-run     # preview what would be applied
supabase db push               # apply 0001, 0002, 0003 to the linked project
```

## 4. Apply the seed

`supabase db execute` does not exist in current CLI versions. Use any one of these:

```bash
# A. Through the CLI, when you push (uses the seed path in supabase/config.toml, default ./seed.sql)
supabase db push --include-seed

# B. Straight to Postgres with psql, using the connection string from the dashboard's Connect panel
psql "<your-postgres-connection-string>" -f supabase/seed.sql
```

**C.** Or paste the contents of `supabase/seed.sql` into the dashboard SQL Editor and run it.

The seed uses `on conflict (slug) do nothing`, so running it twice never duplicates the event and never overwrites edits you made afterwards.

## 5. Make yourself an admin

Being signed in is not enough for `/admin`; you need a row in `admin_users`. After your first magic-link sign-in, run this in the SQL Editor (it runs as a privileged role, so RLS does not get in the way):

```sql
insert into public.admin_users (id, email, role)
select id, email, 'owner' from auth.users where email = 'you@example.com';
```

## 6. Regenerate TypeScript types

```bash
npm run gen:db-types
```

This runs `scripts/gen-db-types.sh`, which writes `lib/supabase/types.ts` from the live schema (needs `supabase login` and a linked project).

Two things to know before you run it:

- **It overwrites the hand-written `lib/supabase/types.ts`.** The generated file types the CHECK-constrained text columns (`status`, `time_window`, `attendance`, `role`, `template`) as plain `string`, and it does not export the helper types the app imports today (`BookingStatus`, `EventStatus`, `TimeWindow`, `Attendance`, `AdminRole`, `EmailTemplate`, `Json`). Re-add those exports (or keep them in a separate file) after regenerating.
- **`npm run gen:db-types` needs a script entry in `package.json`.** If it is not there yet, add `"gen:db-types": "bash scripts/gen-db-types.sh"` under `scripts`.

## Running everything locally instead

Needs Docker. `supabase start` boots a local Postgres, Auth and Studio on your machine:

```bash
supabase start
supabase db reset      # drops the local DB, replays every migration in order, then runs seed.sql
```

Use `supabase db reset` any time you edit a migration during development. Never edit a migration that has already been pushed to the hosted project; add a new numbered file instead.

## Security model in one paragraph

All tables have RLS on. The public (`anon`) can read published events and insert into the waitlist and newsletter tables, and nothing else. Admins (rows in `admin_users`) can read everything but write nothing directly. All writes, and the whole booking flow, go through server code using the `service_role` key, which must never reach the browser. Migration `0003` also issues explicit `GRANT`s, because Supabase no longer auto-grants privileges on new public tables, and `service_role` bypasses RLS but not grants.

Two practical rules for the public forms: do not chain `.select()` onto a waitlist or newsletter `insert` (the public has no read access, so the read-back is blocked), and treat a duplicate-email error (`23505`) on the newsletter as success so the form does not reveal who is subscribed.
