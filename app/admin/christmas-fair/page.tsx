import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { controlClass, Notice, PageHeader, Panel, Td, Th } from "@/components/admin/ui";
import { supabaseService } from "@/lib/supabase/service";
import { FAIR, formatLondonDeadline, formatPence, isFuture, vendorCategoryLabel } from "@/lib/christmas-fair/config";
import type { FairTicketStatus, FairVendorStatus } from "@/lib/supabase/types";
import { approveVendor, cancelFamilyTicket, declineVendor, updateChristmasFairCapacities } from "./actions";

export const metadata: Metadata = { title: "Christmas Fair" };
export const instant = false;

const vendorStatus: Record<FairVendorStatus, { label: string; className: string }> = {
  pending: { label: "Awaiting review", className: "bg-amber-100 text-amber-900" },
  approved: { label: "Approved · awaiting payment", className: "bg-sky-100 text-sky-900" },
  paid: { label: "Paid · table booked", className: "bg-emerald-100 text-emerald-900" },
  declined: { label: "Declined", className: "bg-red-100 text-red-900" },
  expired: { label: "Payment window missed", className: "bg-stone-200 text-stone-900" },
  refunded: { label: "Refunded", className: "bg-stone-200 text-stone-900" },
};

const ticketStatus: Record<FairTicketStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-900",
  pending_payment: "bg-amber-100 text-amber-900",
  expired: "bg-stone-200 text-stone-900",
  cancelled: "bg-red-100 text-red-900",
  refunded: "bg-stone-200 text-stone-900",
};

const NOTICES: Record<string, { tone: "info" | "error"; text: string }> = {
  saved: { tone: "info", text: "Saved." },
  approved: { tone: "info", text: "Approved. The vendor has been emailed their payment link and has 3 days to pay." },
  "approved-email-failed": { tone: "error", text: "Approved, but the email didn’t send. It will be retried automatically tomorrow morning, or click “Re-send approval” to try again now." },
  declined: { tone: "info", text: "Declined. The vendor has been emailed." },
  "declined-email-failed": { tone: "error", text: "Declined, but the email didn’t send. It will be retried automatically tomorrow morning." },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });

export default async function AdminChristmasFairPage({ searchParams }: PageProps<"/admin/christmas-fair">) {
  const { admin } = await requireAdmin();
  const writable = canWrite(admin.role);
  const query = await searchParams;
  const db = supabaseService();
  const eventResult = await db.from("events").select("id, max_family_tickets, max_vendor_pitches").eq("slug", FAIR.slug).maybeSingle();
  const event = eventResult.data;
  const [ticketsResult, vendorsResult] = event ? await Promise.all([
    db.from("christmas_fair_tickets").select("id, ticket_code, family_name, email, phone, adult_count, child_count, status, created_at, amount_paid_pence, extra_donation_pence, paid_at").eq("event_id", event.id).neq("status", "expired").order("created_at", { ascending: false }),
    db.from("christmas_fair_vendors").select("id, access_token, business_name, contact_name, email, phone, category, description, website, needs_power, has_public_liability_insurance, status, created_at, table_price_pence, payment_due_at, amount_paid_pence, paid_at, logo_path, photo_paths").eq("event_id", event.id).order("created_at", { ascending: false }),
  ]) : [{ data: [], error: eventResult.error }, { data: [], error: eventResult.error }];
  const tickets = ticketsResult.data ?? [];
  const vendors = vendorsResult.data ?? [];

  const confirmed = tickets.filter((t) => t.status === "confirmed");
  const people = confirmed.reduce((sum, t) => sum + t.adult_count + t.child_count, 0);
  const raised = confirmed.reduce((sum, t) => sum + (t.amount_paid_pence ?? 0), 0);
  const holding = vendors.filter((v) => v.status === "paid" || (v.status === "approved" && isFuture(v.payment_due_at)));
  const paidVendors = vendors.filter((v) => v.status === "paid");
  const earlyBirdUsed = holding.filter((v) => v.table_price_pence === FAIR.earlyBirdPricePence).length;
  const familyLimit = event?.max_family_tickets ?? FAIR.familyCapacity;
  const vendorLimit = event?.max_vendor_pitches ?? FAIR.vendorCapacity;

  const imagePaths = vendors.flatMap((v) => [...(v.logo_path ? [v.logo_path] : []), ...v.photo_paths]);
  const signed = imagePaths.length ? (await db.storage.from(FAIR.uploadBucket).createSignedUrls(imagePaths, 60 * 60)).data ?? [] : [];
  const urlFor = (path: string) => signed.find((s) => s.path === path)?.signedUrl ?? null;
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;

  return (
    <Container className="py-8">
      <PageHeader title="Christmas Fair" description={`${FAIR.dateLabel} · ${FAIR.timeLabel} · ${FAIR.venue}, ${FAIR.address}`} actions={<Link href="/admin/emails" className="inline-flex min-h-11 items-center rounded-pill border-[1.5px] border-indigo px-5 font-bold text-indigo no-underline">Emails &amp; templates</Link>} />
      {notice ? <div className="pb-5"><Notice tone={notice.tone}>{notice.text}</Notice></div> : null}
      {query.error === "capacity" ? <div className="pb-5"><Notice>That capacity can’t be lower than the number of confirmed families or held vendor tables.</Notice></div> : null}
      {query.error === "vendors-full" ? <div className="pb-5"><Notice>All vendor tables are held or paid for. Increase the vendor limit before approving another vendor.</Notice></div> : null}
      {query.error === "vendor" ? <div className="pb-5"><Notice>That vendor couldn’t be updated. Refresh the page and try again.</Notice></div> : null}
      {eventResult.error || ticketsResult.error || vendorsResult.error ? <div className="pb-5"><Notice>Some fair records could not be loaded. Refresh the page and try again.</Notice></div> : null}

      <section className="mb-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="p-5 sm:p-6">
          <h2 className="m-0 text-xl font-extrabold text-indigo">At a glance</h2>
          <dl className="mb-0 mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Families booked" value={`${confirmed.length} / ${familyLimit}`} />
            <Stat label="People coming" value={String(people)} />
            <Stat label="Raised for charity" value={formatPence(raised)} />
            <Stat label="Vendor tables held" value={`${holding.length} / ${vendorLimit}`} />
            <Stat label="Tables paid" value={String(paidVendors.length)} />
            <Stat label="Early-bird tables used" value={`${earlyBirdUsed} / ${FAIR.earlyBirdTables}`} />
          </dl>
          <p className="mb-0 mt-4 text-sm text-periwinkle">“Raised” is what families paid through Stripe, before Stripe’s fees. A held table is one that’s paid for, or approved and still inside its 3-day payment window.</p>
        </Panel>
        <Panel className="p-5 sm:p-6">
          <h2 className="m-0 text-xl font-extrabold text-indigo">Available places</h2>
          <form action={updateChristmasFairCapacities} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-bold">Family ticket limit<input className={controlClass} type="number" min={confirmed.length} max="10000" name="maxFamilies" defaultValue={familyLimit} required disabled={!writable} /></label>
            <label className="flex flex-col gap-1 text-sm font-bold">Vendor table limit<input className={controlClass} type="number" min={holding.length} max="10000" name="maxVendors" defaultValue={vendorLimit} required disabled={!writable} /></label>
            {writable ? <button className="min-h-11 rounded-pill bg-indigo px-5 font-bold text-white sm:col-span-2 sm:justify-self-start">Save limits</button> : <p className="m-0 text-sm text-periwinkle sm:col-span-2">Your admin role is read-only.</p>}
          </form>
        </Panel>
      </section>

      <section id="vendors" className="mb-10 scroll-mt-6">
        <h2 className="mb-1 text-xl font-extrabold text-indigo">Vendor applications <span className="font-normal text-periwinkle">({vendors.length})</span></h2>
        <p className="mb-3 mt-0 text-sm text-periwinkle">Approving emails the vendor a payment link and gives them 3 days to pay ({formatPence(FAIR.earlyBirdPricePence)} for the first {FAIR.earlyBirdTables} tables, then {formatPence(FAIR.standardPricePence)}). Declining sends a polite “not this time” email. You can change the wording in <Link href="/admin/emails" className="font-bold underline">Emails</Link>.</p>
        <div className="flex flex-col gap-4">
          {vendors.map((vendor) => {
            const status = vendorStatus[vendor.status];
            const windowOpen = vendor.status === "approved" && isFuture(vendor.payment_due_at);
            return (
              <Panel key={vendor.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-4">
                    {vendor.logo_path && urlFor(vendor.logo_path) ? <img src={urlFor(vendor.logo_path)!} alt={`${vendor.business_name} logo`} className="size-20 shrink-0 rounded-xl border border-blush object-contain" /> : <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-blush text-center text-xs font-bold text-periwinkle">No logo</span>}
                    <div className="min-w-0">
                      <h3 className="m-0 text-lg font-extrabold text-indigo">{vendor.business_name}</h3>
                      <p className="m-0 text-sm"><strong>{vendorCategoryLabel(vendor.category)}</strong> · {vendor.contact_name} · <a href={`mailto:${vendor.email}`} className="font-bold underline">{vendor.email}</a> · {vendor.phone}</p>
                      <p className="m-0 mt-2 max-w-[760px] whitespace-pre-line text-sm">{vendor.description}</p>
                      <p className="m-0 mt-2 text-sm">Power: <strong>{vendor.needs_power ? "Yes" : "No"}</strong> · Insurance confirmed: <strong>{vendor.has_public_liability_insurance ? "Yes" : "No"}</strong>{vendor.website ? <> · <a href={vendor.website} target="_blank" rel="noreferrer" className="font-bold underline">Website / social</a></> : null} · Applied {dateFormat.format(new Date(vendor.created_at))}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={`rounded-pill px-3 py-1 text-xs font-extrabold ${status.className}`}>{status.label}</span>
                    {vendor.table_price_pence ? <span className="text-sm">Table: <strong>{formatPence(vendor.table_price_pence)}</strong>{vendor.table_price_pence === FAIR.earlyBirdPricePence ? " (early bird)" : ""}</span> : null}
                    {vendor.status === "approved" && vendor.payment_due_at ? <span className="text-sm">Pay by {formatLondonDeadline(vendor.payment_due_at)}</span> : null}
                    {vendor.status === "approved" && !vendor.payment_due_at ? <span className="text-sm font-bold text-amber-900">Approved before online payments. Send them their link.</span> : null}
                    {vendor.status === "paid" && vendor.amount_paid_pence !== null ? <span className="text-sm">Paid {formatPence(vendor.amount_paid_pence)}{vendor.paid_at ? ` on ${dateFormat.format(new Date(vendor.paid_at))}` : ""}</span> : null}
                    <Link href={`/christmas-fair/vendor/${vendor.access_token}`} className="text-sm font-bold underline" target="_blank">Vendor’s page</Link>
                  </div>
                </div>
                {vendor.photo_paths.length ? (
                  <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
                    {vendor.photo_paths.map((path) => { const url = urlFor(path); return url ? <li key={path}><a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`${vendor.business_name} photo`} className="size-24 rounded-lg object-cover" /></a></li> : null; })}
                  </ul>
                ) : <p className="m-0 mt-3 text-sm text-periwinkle">No photos uploaded yet.</p>}
                {writable && vendor.status !== "paid" && vendor.status !== "refunded" ? (
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-blush pt-4">
                    <form action={approveVendor}><input type="hidden" name="vendorId" value={vendor.id} /><button className="min-h-11 rounded-pill bg-emerald-800 px-5 font-bold text-white">{vendor.status === "approved" && windowOpen ? "Re-send approval email" : vendor.status === "approved" || vendor.status === "expired" ? "Send a new payment link (3 days)" : vendor.status === "declined" ? "Approve after all" : "Approve & send payment link"}</button></form>
                    {vendor.status !== "declined" ? <form action={declineVendor}><input type="hidden" name="vendorId" value={vendor.id} /><button className="min-h-11 rounded-pill border-[1.5px] border-red-800 px-5 font-bold text-red-800">Decline &amp; email</button></form> : null}
                  </div>
                ) : null}
              </Panel>
            );
          })}
          {vendors.length === 0 ? <Panel className="p-8 text-center text-periwinkle">No vendor applications yet.</Panel> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-extrabold text-indigo">Family tickets <span className="font-normal text-periwinkle">({tickets.length})</span></h2>
        <p className="mb-3 mt-0 text-sm text-periwinkle">“Awaiting payment” families are mid-checkout. Unpaid holds lapse after about 30 minutes. Cancelling a ticket doesn’t refund it; refund in Stripe if needed.</p>
        <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[960px] border-collapse"><caption className="sr-only">Christmas Fair family tickets</caption><thead><tr><Th>Family</Th><Th>Email / phone</Th><Th>Party size</Th><Th>Donation</Th><Th>Ticket</Th><Th>Booked</Th><Th>Status</Th><Th /></tr></thead><tbody className="divide-y divide-blush">{tickets.map((ticket) => <tr key={ticket.id}><Td><strong>{ticket.family_name}</strong></Td><Td><span className="block">{ticket.email}</span><span className="text-sm text-periwinkle">{ticket.phone ?? "No phone"}</span></Td><Td>{ticket.adult_count} adults · {ticket.child_count} children ({ticket.adult_count + ticket.child_count})</Td><Td>{ticket.amount_paid_pence !== null ? <>{formatPence(ticket.amount_paid_pence)}{ticket.extra_donation_pence > 0 ? <span className="block text-sm text-periwinkle">incl. {formatPence(ticket.extra_donation_pence)} extra</span> : null}</> : ticket.status === "confirmed" ? <span className="text-sm text-periwinkle">Free (booked early)</span> : "—"}</Td><Td className="font-mono text-sm">{ticket.status === "confirmed" ? <a href={`/christmas-fair/ticket/${ticket.ticket_code}`} className="underline">{ticket.ticket_code.slice(0, 8).toUpperCase()}</a> : ticket.ticket_code.slice(0, 8).toUpperCase()}</Td><Td className="whitespace-nowrap">{dateFormat.format(new Date(ticket.created_at))}</Td><Td><span className={`rounded-pill px-3 py-1 text-xs font-extrabold ${ticketStatus[ticket.status]}`}>{ticket.status === "pending_payment" ? "awaiting payment" : ticket.status}</span></Td><Td>{writable && ticket.status === "confirmed" ? <form action={cancelFamilyTicket}><input type="hidden" name="ticketId" value={ticket.id} /><button className="min-h-10 font-bold text-red-800 underline">Cancel</button></form> : null}</Td></tr>)}{tickets.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-periwinkle">No family tickets yet.</td></tr> : null}</tbody></table></div></Panel>
      </section>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-input bg-blush p-4"><dt className="text-sm font-bold text-periwinkle">{label}</dt><dd className="mb-0 mt-1 text-2xl font-extrabold text-indigo">{value}</dd></div>;
}
