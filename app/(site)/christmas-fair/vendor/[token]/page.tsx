import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/service";
import { FAIR, formatLondonDeadline, formatPence, isFuture, vendorCategoryLabel } from "@/lib/christmas-fair/config";
import { VendorUploadForm } from "@/components/christmas-fair-vendor-uploads";
import { payVendorTable } from "../../actions";

export const metadata: Metadata = {
  title: "Your Christmas Fair vendor page",
  robots: { index: false, follow: false },
};
export const instant = false;

/**
 * A vendor's private page, reached from their emails (the token is a random
 * uuid). Shows where their application is up to, lets them pay for their
 * table once approved, and lets them add or replace their logo and photos.
 */
export default async function VendorPage({ params, searchParams }: PageProps<"/christmas-fair/vendor/[token]">) {
  const { token } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(token).success) notFound();
  const db = supabaseService();
  const { data: vendor } = await db.from("christmas_fair_vendors")
    .select("business_name, contact_name, category, status, table_price_pence, payment_due_at, amount_paid_pence, logo_path, photo_paths")
    .eq("access_token", token).maybeSingle();
  if (!vendor) notFound();

  const paths = [...(vendor.logo_path ? [vendor.logo_path] : []), ...vendor.photo_paths];
  const signed = paths.length ? (await db.storage.from(FAIR.uploadBucket).createSignedUrls(paths, 60 * 60)).data ?? [] : [];
  const urlFor = (path: string) => signed.find((s) => s.path === path)?.signedUrl ?? null;
  const canPay = vendor.status === "approved" && vendor.table_price_pence && isFuture(vendor.payment_due_at);
  const windowClosed = (vendor.status === "approved" && vendor.payment_due_at && !canPay) || vendor.status === "expired";
  const awaitingLink = vendor.status === "approved" && !vendor.payment_due_at;
  const justPaid = query.paid === "1";

  return (
    <section className="fair-grid-paper min-h-[80vh] px-4 py-10 text-[#452C86] sm:py-14">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div>
          <p className="m-0 text-sm font-extrabold uppercase tracking-[.14em] text-[#C8312B]">Trybe Christmas Fair · vendor</p>
          <h1 className="display m-0 mt-1 text-[clamp(40px,6vw,64px)] uppercase leading-[.9]">{vendor.business_name}</h1>
          <p className="m-0 mt-2 text-lg">{vendorCategoryLabel(vendor.category)} · {vendor.contact_name}</p>
        </div>

        {query.error === "payment" ? <p role="alert" className="m-0 rounded-xl bg-red-100 p-4 font-semibold text-red-900">We couldn’t start the payment just now. Please try again in a moment.</p> : null}

        <div className="rounded-[26px] border-2 border-[#452C86] bg-white p-6 shadow-[0_6px_0_#452C86] sm:p-8">
          {vendor.status === "paid" ? (
            <Panel title="Your table is booked!">
              <p>Thank you, we’ve received your payment of {formatPence(vendor.amount_paid_pence ?? vendor.table_price_pence ?? 0)}. See you on {FAIR.dateLabel}.</p>
              <Details />
            </Panel>
          ) : justPaid && (vendor.status === "approved" || vendor.status === "expired") ? (
            <Panel title="Confirming your payment…">
              <p>Thanks! We’re just confirming your payment with Stripe. You’ll get a confirmation email shortly. Refresh this page in a moment.</p>
            </Panel>
          ) : canPay ? (
            <Panel title="You’re approved! Book your table">
              <p>Your table is <strong>{formatPence(vendor.table_price_pence!)}</strong>{vendor.table_price_pence === FAIR.earlyBirdPricePence ? " (early bird price)" : ""}. Please pay by <strong>{formatLondonDeadline(vendor.payment_due_at!)}</strong>, or your space will be offered to another vendor.</p>
              <form action={payVendorTable}>
                <input type="hidden" name="token" value={token} />
                <button className="inline-flex min-h-14 items-center rounded-full bg-[#C8312B] px-7 text-[17px] font-extrabold text-white shadow-[0_5px_0_#452C86]">Pay {formatPence(vendor.table_price_pence!)} with Stripe</button>
              </form>
              <Details />
            </Panel>
          ) : awaitingLink ? (
            <Panel title="You’re approved">
              <p>We’ll email your payment link shortly. If you’re waiting on it, email <a className="font-bold underline" href={`mailto:${FAIR.adminEmail}`}>{FAIR.adminEmail}</a>.</p>
            </Panel>
          ) : windowClosed || query.error === "closed" ? (
            <Panel title="Your payment window has closed">
              <p>We didn’t receive payment within {FAIR.vendorPaymentDays} days, so your space has been released. If you’d still like a table, email <a className="font-bold underline" href={`mailto:${FAIR.adminEmail}`}>{FAIR.adminEmail}</a> and we’ll see if one is available.</p>
            </Panel>
          ) : vendor.status === "declined" ? (
            <Panel title="Thank you for applying">
              <p>Unfortunately we can’t offer you a table at this year’s fair. We’d love to hear from you for future Trybe events.</p>
            </Panel>
          ) : vendor.status === "refunded" ? (
            <Panel title="Your payment was refunded">
              <p>If you have any questions, email <a className="font-bold underline" href={`mailto:${FAIR.adminEmail}`}>{FAIR.adminEmail}</a>.</p>
            </Panel>
          ) : (
            <Panel title="We’re reviewing your application">
              <p>Thanks for applying. If you’re approved, we’ll email you a link to pay for your table: {formatPence(FAIR.earlyBirdPricePence)} early bird for the first {FAIR.earlyBirdTables} tables, then {formatPence(FAIR.standardPricePence)}. You’ll have {FAIR.vendorPaymentDays} days to pay.</p>
            </Panel>
          )}
        </div>

        {vendor.status !== "declined" && vendor.status !== "refunded" ? (
          <div className="rounded-[26px] bg-white p-6 sm:p-8">
            <h2 className="m-0 text-2xl font-extrabold">Your logo and photos</h2>
            <p className="m-0 mt-1 text-[color:var(--muted-plum)]">We’ll use these to promote your stall on the website and socials.</p>
            {paths.length ? (
              <ul className="my-5 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-5">
                {paths.map((path) => {
                  const url = urlFor(path);
                  return <li key={path} className="overflow-hidden rounded-xl border-2 border-[#F4E7F3] bg-[#FBF5EC]">{url ? <img src={url} alt={path === vendor.logo_path ? `${vendor.business_name} logo` : `${vendor.business_name} photo`} className="aspect-square w-full object-cover" /> : <span className="flex aspect-square items-center justify-center p-2 text-center text-xs">Preview unavailable</span>}</li>;
                })}
              </ul>
            ) : <p className="my-4 font-bold">No images yet.</p>}
            <VendorUploadForm token={token} hasLogo={Boolean(vendor.logo_path)} hasPhotos={vendor.photo_paths.length > 0} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 text-lg [&_p]:m-0"><h2 className="display m-0 text-[34px] uppercase leading-[.95]">{title}</h2>{children}</div>;
}

function Details() {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 rounded-[18px] bg-[#F4E7F3] p-5 text-base">
      <li><strong>When:</strong> {FAIR.dateLabel}, {FAIR.timeLabel}</li>
      <li><strong>Where:</strong> {FAIR.venue}, {FAIR.address} ({FAIR.directions.toLowerCase()})</li>
      <li><strong>Set-up:</strong> from {FAIR.setUpLabel} · <strong>Pack-down:</strong> finished by {FAIR.packDownLabel}</li>
      <li>Tables and chairs are provided. Please bring your one-day event public liability insurance details.</li>
      <li>Selling paid sessions or experiences? You take and manage those bookings yourself.</li>
    </ul>
  );
}
