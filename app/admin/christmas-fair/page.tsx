import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { controlClass, Notice, PageHeader, Panel, Td, Th } from "@/components/admin/ui";
import { supabaseService } from "@/lib/supabase/service";
import { updateChristmasFairCapacities, setVendorApplicationStatus, cancelFamilyTicket } from "./actions";

export const metadata: Metadata = { title: "Christmas Fair" };
export const instant = false;

type VendorStatus = "pending" | "accepted" | "declined";
const statusColor: Record<VendorStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  accepted: "bg-emerald-100 text-emerald-900",
  declined: "bg-red-100 text-red-900",
};

export default async function AdminChristmasFairPage({ searchParams }: PageProps<"/admin/christmas-fair">) {
  const { admin } = await requireAdmin();
  const writable = canWrite(admin.role);
  const query = await searchParams;
  const db = supabaseService();
  const eventResult = await db.from("events").select("id, max_family_tickets, max_vendor_pitches").eq("slug", "christmas-fair-2026").maybeSingle();
  const event = eventResult.data;
  const [ticketsResult, vendorsResult] = event ? await Promise.all([
    db.from("christmas_fair_tickets").select("id, ticket_code, family_name, email, phone, adult_count, child_count, status, created_at").eq("event_id", event.id).order("created_at", { ascending: false }),
    db.from("christmas_fair_vendors").select("id, business_name, contact_name, email, phone, category, description, website, needs_power, has_public_liability_insurance, food_hygiene_rating, status, created_at").eq("event_id", event.id).order("created_at", { ascending: false }),
  ]) : [{ data: [], error: eventResult.error }, { data: [], error: eventResult.error }];
  const tickets = ticketsResult.data ?? [];
  const vendors = vendorsResult.data ?? [];
  const bookedFamilies = tickets.filter((ticket) => ticket.status === "confirmed").length;
  const acceptedVendors = vendors.filter((vendor) => vendor.status === "accepted").length;

  return (
    <Container className="py-8">
      <PageHeader title="Christmas Fair" description="Family tickets, vendor applications, and available places." />
      {query.updated === "1" ? <div className="pb-5"><Notice tone="info">Saved.</Notice></div> : null}
      {query.error === "capacity" ? <div className="pb-5"><Notice>That capacity can’t be lower than the number of confirmed families or accepted vendors.</Notice></div> : null}
      {query.error === "vendors-full" ? <div className="pb-5"><Notice>All vendor pitches are assigned. Increase the vendor limit before accepting another application.</Notice></div> : null}
      {eventResult.error || ticketsResult.error || vendorsResult.error ? <div className="pb-5"><Notice>Some fair records could not be loaded. Refresh the page and try again.</Notice></div> : null}

      <section className="mb-8 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <h2 className="m-0 text-xl font-extrabold text-indigo">Available places</h2>
          <p className="mb-5 mt-1 text-sm text-periwinkle">Current commitments: {bookedFamilies} family tickets and {acceptedVendors} accepted vendors.</p>
          <form action={updateChristmasFairCapacities} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-bold">Family ticket limit<input className={controlClass} type="number" min={bookedFamilies} max="10000" name="maxFamilies" defaultValue={event?.max_family_tickets ?? 50} required disabled={!writable} /></label>
            <label className="flex flex-col gap-1 text-sm font-bold">Vendor pitch limit<input className={controlClass} type="number" min={acceptedVendors} max="10000" name="maxVendors" defaultValue={event?.max_vendor_pitches ?? 20} required disabled={!writable} /></label>
            {writable ? <button className="min-h-11 rounded-pill bg-indigo px-5 font-bold text-white sm:col-span-2 sm:justify-self-start">Save capacity</button> : <p className="m-0 text-sm text-periwinkle sm:col-span-2">Your admin role is read-only.</p>}
          </form>
        </Panel>
        <Panel className="p-5 sm:p-6">
          <h2 className="m-0 text-xl font-extrabold text-indigo">At a glance</h2>
          <dl className="mb-0 mt-4 grid grid-cols-2 gap-4">
            <Stat label="Family tickets" value={`${bookedFamilies} / ${event?.max_family_tickets ?? 50}`} />
            <Stat label="Available family places" value={String(Math.max(0, (event?.max_family_tickets ?? 50) - bookedFamilies))} />
            <Stat label="Accepted vendors" value={`${acceptedVendors} / ${event?.max_vendor_pitches ?? 20}`} />
            <Stat label="Pending vendor applications" value={String(vendors.filter((vendor) => vendor.status === "pending").length)} />
          </dl>
          <p className="mb-0 mt-4 text-sm text-periwinkle">The £20 pitch fee is handled directly by Trybe after acceptance.</p>
        </Panel>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-extrabold text-indigo">Family ticket registrations <span className="font-normal text-periwinkle">({tickets.length})</span></h2>
        <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[860px] border-collapse"><caption className="sr-only">Christmas Fair family ticket registrations</caption><thead><tr><Th>Family</Th><Th>Email / phone</Th><Th>Party size</Th><Th>Ticket</Th><Th>Registered</Th><Th>Status</Th><Th /></tr></thead><tbody className="divide-y divide-blush">{tickets.map((ticket) => <tr key={ticket.id}><Td><strong>{ticket.family_name}</strong></Td><Td><span className="block">{ticket.email}</span><span className="text-sm text-periwinkle">{ticket.phone ?? "No phone"}</span></Td><Td>{ticket.adult_count} adults · {ticket.child_count} children ({ticket.adult_count + ticket.child_count})</Td><Td className="font-mono text-sm"><a href={`/christmas-fair/ticket/${ticket.ticket_code}`} className="underline">{ticket.ticket_code.slice(0, 8).toUpperCase()}</a></Td><Td className="whitespace-nowrap">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(new Date(ticket.created_at))}</Td><Td><span className={`rounded-pill px-3 py-1 text-xs font-extrabold ${ticket.status === "confirmed" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{ticket.status}</span></Td><Td>{writable && ticket.status === "confirmed" ? <form action={cancelFamilyTicket}><input type="hidden" name="ticketId" value={ticket.id} /><button className="min-h-10 font-bold text-red-800 underline">Cancel</button></form> : null}</Td></tr>)}{tickets.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-periwinkle">No family tickets yet.</td></tr> : null}</tbody></table></div></Panel>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-indigo">Vendor applications <span className="font-normal text-periwinkle">({vendors.length})</span></h2>
        <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse"><caption className="sr-only">Christmas Fair vendor applications</caption><thead><tr><Th>Business / contact</Th><Th>Category / description</Th><Th>Contact</Th><Th>Requirements</Th><Th>Status</Th><Th>Decision</Th></tr></thead><tbody className="divide-y divide-blush">{vendors.map((vendor) => <tr key={vendor.id} className="align-top"><Td><strong className="block">{vendor.business_name}</strong><span>{vendor.contact_name}</span></Td><Td><strong className="block capitalize">{vendor.category === "kids" ? "Children’s activity" : vendor.category === "food" ? "Food & treats" : vendor.category === "crafts" ? "Crafts & gifts" : "Something else"}</strong><span className="block max-w-[300px] whitespace-normal text-sm">{vendor.description}</span>{vendor.website ? <a href={vendor.website} target="_blank" rel="noreferrer" className="font-bold underline">Website / social</a> : null}</Td><Td><a href={`mailto:${vendor.email}`} className="font-bold underline">{vendor.email}</a><span className="block">{vendor.phone}</span></Td><Td><span className="block">Power: {vendor.needs_power ? "Yes" : "No"}</span><span className="block">Insurance: {vendor.has_public_liability_insurance ? "Yes" : "No"}</span>{vendor.food_hygiene_rating ? <span className="block">Food rating: {vendor.food_hygiene_rating}</span> : null}</Td><Td><span className={`rounded-pill px-3 py-1 text-xs font-extrabold ${statusColor[vendor.status]}`}>{vendor.status}</span></Td><Td>{writable ? <div className="flex flex-col items-start gap-1">{vendor.status !== "accepted" ? <VendorAction id={vendor.id} status="accepted" label="Accept" /> : null}{vendor.status !== "declined" ? <VendorAction id={vendor.id} status="declined" label="Decline" /> : null}<span className="text-xs text-periwinkle">Contact vendor directly about payment.</span></div> : null}</Td></tr>)}{vendors.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-periwinkle">No vendor applications yet.</td></tr> : null}</tbody></table></div></Panel>
      </section>
    </Container>
  );
}

function VendorAction({ id, status, label }: { id: string; status: "accepted" | "declined"; label: string }) {
  return <form action={setVendorApplicationStatus}><input type="hidden" name="vendorId" value={id} /><input type="hidden" name="status" value={status} /><button className={`min-h-10 font-bold underline ${status === "declined" ? "text-red-800" : "text-emerald-800"}`}>{label}</button></form>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-input bg-blush p-4"><dt className="text-sm font-bold text-periwinkle">{label}</dt><dd className="mb-0 mt-1 text-2xl font-extrabold text-indigo">{value}</dd></div>;
}
