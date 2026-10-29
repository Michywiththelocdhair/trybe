#!/usr/bin/env bash
set -euo pipefail
# Regenerates lib/supabase/types.ts from the live schema.
# Requires `supabase login` and a linked project (`supabase link --project-ref ...`).
#
# WARNING: this OVERWRITES lib/supabase/types.ts. The generated file types
# CHECK-constrained text columns as plain `string` and does not export the
# hand-written helpers the app imports today (BookingStatus, EventStatus,
# TimeWindow, Attendance, AdminRole, EmailTemplate, Json). Regenerating without
# restoring those exports will break imports across the app.
#
# Written to a temp file first so a failed `supabase` call (not logged in, not
# linked, offline) cannot leave types.ts truncated.

cd "$(dirname "$0")/.."

out="lib/supabase/types.ts"
tmp="$(mktemp "${out}.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

supabase gen types typescript --linked --schema public > "$tmp"
chmod 644 "$tmp"  # mktemp creates 0600; keep the file readable like the original
mv "$tmp" "$out"
echo "Wrote $out"
