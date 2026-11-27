#!/usr/bin/env node
/**
 * One-off: adds the four confirmed Christmas Fair stallholders to the admin
 * page (/admin/christmas-fair) as "Paid · table booked", with their logos and
 * photos, WITHOUT sending them (or the admin inbox) any emails.
 *
 * Run from the repo root on your own machine:
 *
 *   node --env-file=.env.local scripts/add-christmas-fair-stallholders.mjs --dry-run   # preview only
 *   node --env-file=.env.local scripts/add-christmas-fair-stallholders.mjs             # add them
 *
 * How emails are avoided: the site's emails are sent (or retried by the daily
 * cron) only while a vendor's *_sent_at / admin_notified_at columns are empty.
 * Every one of those is filled in when the row is created, so nothing is ever
 * queued for these vendors. Nothing here calls Resend.
 *
 * Safe to run twice: a vendor whose email (or business name) is already on the
 * fair is skipped.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const FAIR_SLUG = "christmas-fair-2026";
const BUCKET = "christmas-fair-vendors";
const IMAGES = path.join(process.cwd(), "public/images/christmas-fair/stallholders");

const VENDORS = [
  {
    business_name: "Sorcha Bridge Photography",
    contact_name: "Sorcha Bridge",
    email: "hello@sorchabridgephotography.com",
    phone: "+447855358859",
    category: "crafts",
    description: "Limited Edition Giclée & Silkscreen Art Prints (£50–£500).\n\nPhotographic artist Sorcha Bridge will be joining us with a collection of limited-edition artworks. Combining photography with creative digital techniques and specialist print finishes, her work celebrates the natural world, with a particular focus on birds, colour and texture.\n\nInstagram: @sorchabridge",
    website: "https://www.sorchabridge.com/",
    needs_power: true,
    logo: "sorcha-bridge-logo.jpg",
    photos: ["sorcha-bridge-1.jpg", "sorcha-bridge-2.jpg", "sorcha-bridge-3.jpg"],
  },
  {
    business_name: "HOUSE17 Jewellery",
    contact_name: "Nicola Haines",
    email: "hello@house17.co.uk",
    phone: "+447821572360",
    category: "crafts",
    description: "Handmade jewellery in recycled silver and 18ct gold vermeil (£45–£269).\n\nHOUSE17 is the creation of jeweller and designer-maker Nicola, who crafts each piece by hand in her East London workshop using the lost-wax casting technique.\n\nInstagram: @hous_e17",
    website: "https://house17.co.uk/",
    needs_power: false,
    logo: "house17-logo.jpg",
    photos: ["house17-1.jpg"],
  },
  {
    business_name: "Bespoke Butterflies",
    contact_name: "Sally Burke",
    email: "sallyrosewood@icloud.com",
    phone: "+447792300729",
    category: "crafts",
    description: "Real butterflies from checkable sustainable sources, set and pinned in handmade wooden frames she makes herself. Small amount of butterfly wing jewellery (£10–£120). Portobello Road Market, W11.\n\nSpotlight: show the hand-framed butterflies only, not ornaments (per Nyah, 26 Nov).\n\nInstagram: @Bespoke_Butterflies",
    website: "https://visitportobello.com/businesses/bespoke-butterflies/",
    needs_power: false,
    logo: "bespoke-butterflies-logo.jpg",
    photos: ["bespoke-butterflies-1.jpg"],
  },
  {
    business_name: "The Cupcake Avenue",
    contact_name: "Doyin Faluyi",
    email: "doyin.cupcakeav@gmail.com",
    phone: "+447940762431",
    category: "food",
    description: "Individually packaged cupcakes: double chocolate, caramel or vanilla (flavours TBC). £1–£2 each.\n\nIt's beginning to look a lot like Christmas! Celebrate the season with some festive cupcakes.\n\nInstagram: @cupcakeav",
    website: "https://cupcakeavenue.wixsite.com/cupcakeav",
    needs_power: false,
    logo: "cupcake-avenue-logo.jpg",
    photos: ["cupcake-avenue-1.jpg"],
  },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env.local scripts/add-christmas-fair-stallholders.mjs");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: event, error: eventError } = await db.from("events").select("id").eq("slug", FAIR_SLUG).maybeSingle();
if (eventError || !event) {
  console.error(`Couldn't find the fair (${FAIR_SLUG}): ${eventError?.message ?? "not found"}`);
  process.exit(1);
}

const { data: existing, error: existingError } = await db.from("christmas_fair_vendors").select("business_name, email").eq("event_id", event.id);
if (existingError) {
  console.error(`Couldn't read existing vendors: ${existingError.message}`);
  process.exit(1);
}
const taken = (v) => (existing ?? []).some((e) => e.email.toLowerCase() === v.email.toLowerCase() || e.business_name.toLowerCase() === v.business_name.toLowerCase());

console.log(DRY_RUN ? "Dry run: nothing will be written.\n" : "");
for (const v of VENDORS) {
  if (taken(v)) {
    console.log(`• ${v.business_name}: already on the fair, skipped.`);
    continue;
  }
  if (DRY_RUN) {
    console.log(`• ${v.business_name}: would be added as Paid · table booked, with ${1 + v.photos.length} images. No emails.`);
    continue;
  }

  const now = new Date().toISOString();
  const { photos, logo, ...fields } = v;
  const { data: row, error } = await db.from("christmas_fair_vendors").insert({
    ...fields,
    event_id: event.id,
    // Not confirmed yet: shows as "Insurance confirmed: No" so you can check.
    has_public_liability_insurance: false,
    status: "paid",
    paid_at: now,
    terms_version: "added-by-trybe-2026-11-27",
    // Fill every "email sent" column so neither the site nor the daily cron
    // ever emails these vendors or the admin inbox about them.
    applicant_confirmation_sent_at: now,
    admin_notified_at: now,
    decision_email_sent_at: now,
    payment_confirmation_sent_at: now,
  }).select("id").single();
  if (error || !row) {
    console.error(`✗ ${v.business_name}: ${error?.message ?? "insert failed"}`);
    continue;
  }

  const stamp = Date.now();
  const upload = async (file, name) => {
    const target = `${row.id}/${name}.jpg`;
    const body = await readFile(path.join(IMAGES, file));
    const { error: upErr } = await db.storage.from(BUCKET).upload(target, body, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(`${file}: ${upErr.message}`);
    return target;
  };
  try {
    const logo_path = await upload(logo, `logo-${stamp}`);
    const photo_paths = [];
    for (const [i, file] of photos.entries()) photo_paths.push(await upload(file, `photo-${stamp}-${i + 1}`));
    const { error: updErr } = await db.from("christmas_fair_vendors").update({ logo_path, photo_paths, uploads_completed_at: new Date().toISOString() }).eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
    console.log(`✓ ${v.business_name}: added as Paid · table booked, with logo and ${photo_paths.length} photo(s).`);
  } catch (e) {
    console.error(`! ${v.business_name}: added, but the images didn't upload (${e.message}). You can re-add them from their vendor page.`);
  }
}
