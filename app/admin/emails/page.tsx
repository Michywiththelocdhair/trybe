import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { requireAdmin } from "@/components/admin/is-admin";
import { Notice, PageHeader, Panel, Td, Th } from "@/components/admin/ui";
import { supabaseService } from "@/lib/supabase/service";
import { EDITABLE_TEMPLATE_KEYS, EDITABLE_TEMPLATES } from "@/lib/email/editable-templates";

export const metadata: Metadata = { title: "Emails" };
export const instant = false;

const TEMPLATE_LABELS: Record<string, string> = {
  confirmation: "Studio Stars booking confirmed",
  receipt: "Studio Stars receipt",
  reminder_48h: "Studio Stars 48h reminder",
  day_of: "Studio Stars day-of",
  thank_you: "Studio Stars thank you",
  waitlist_opened: "Waitlist place opened",
  admin_booking: "Admin: new Studio Stars booking",
  fair_admin_notice: "Admin: Christmas Fair notice",
  other: "Test / other",
  ...Object.fromEntries(EDITABLE_TEMPLATE_KEYS.map((key) => [key, EDITABLE_TEMPLATES[key].name])),
};

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export default async function AdminEmailsPage({ searchParams }: PageProps<"/admin/emails">) {
  await requireAdmin();
  const query = await searchParams;
  const filter = typeof query.template === "string" && query.template in TEMPLATE_LABELS ? query.template : null;
  const db = supabaseService();
  let logQuery = db.from("email_log").select("id, recipient_email, template, subject, sent_at, error").order("sent_at", { ascending: false }).limit(200);
  if (filter) logQuery = logQuery.eq("template", filter as never);
  const [{ data: sent, error }, { data: edited }] = await Promise.all([
    logQuery,
    db.from("email_templates").select("key, updated_at"),
  ]);
  const editedAt = new Map((edited ?? []).map((row) => [row.key, row.updated_at]));

  return (
    <Container className="py-8">
      <PageHeader title="Emails" description="Change the wording of the Christmas Fair emails, and see every email the website has sent." />

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-extrabold text-indigo">Christmas Fair email templates</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {EDITABLE_TEMPLATE_KEYS.map((key) => {
            const template = EDITABLE_TEMPLATES[key];
            const updated = editedAt.get(key);
            return (
              <Panel key={key} className="flex flex-col gap-2 p-5">
                <h3 className="m-0 text-lg font-extrabold text-indigo">{template.name}</h3>
                <p className="m-0 text-sm text-periwinkle">{template.description}</p>
                <p className="m-0 text-sm">{updated ? <>Edited {when.format(new Date(updated))}</> : "Using the default wording"}</p>
                <Link href={`/admin/emails/templates/${key}`} className="mt-auto inline-flex min-h-11 items-center self-start rounded-pill bg-indigo px-5 font-bold text-white no-underline">View &amp; edit</Link>
              </Panel>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="m-0 text-xl font-extrabold text-indigo">Sent emails <span className="font-normal text-periwinkle">(latest 200)</span></h2>
          <form className="flex items-center gap-2 text-sm font-bold">
            <label htmlFor="template-filter">Show</label>
            <select id="template-filter" name="template" defaultValue={filter ?? ""} className="min-h-11 rounded-input border-[1.5px] border-[color:var(--border-plum)] bg-white px-3">
              <option value="">All emails</option>
              {Object.entries(TEMPLATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="min-h-11 rounded-pill border-[1.5px] border-indigo px-4 text-indigo">Filter</button>
          </form>
        </div>
        {error ? <div className="pb-4"><Notice>The email log couldn’t be loaded.</Notice></div> : null}
        <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[860px] border-collapse"><caption className="sr-only">Emails sent by the website</caption><thead><tr><Th>Sent</Th><Th>To</Th><Th>Email</Th><Th>Subject</Th><Th>Status</Th><Th /></tr></thead><tbody className="divide-y divide-blush">
          {(sent ?? []).map((row) => (
            <tr key={row.id}>
              <Td className="whitespace-nowrap">{when.format(new Date(row.sent_at))}</Td>
              <Td>{row.recipient_email}</Td>
              <Td>{TEMPLATE_LABELS[row.template] ?? row.template}</Td>
              <Td className="max-w-[360px]">{row.subject ?? <span className="text-periwinkle">(not recorded)</span>}</Td>
              <Td>{row.error ? <span className="rounded-pill bg-red-100 px-3 py-1 text-xs font-extrabold text-red-900" title={row.error}>Failed</span> : <span className="rounded-pill bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900">Sent</span>}</Td>
              <Td><Link href={`/admin/emails/sent/${row.id}`} className="font-bold underline">View</Link></Td>
            </tr>
          ))}
          {(sent ?? []).length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-periwinkle">No emails yet.</td></tr> : null}
        </tbody></table></div></Panel>
      </section>
    </Container>
  );
}
