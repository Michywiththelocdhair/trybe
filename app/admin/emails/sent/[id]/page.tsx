import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Container } from "@/components/layout/container";
import { requireAdmin } from "@/components/admin/is-admin";
import { Notice, PageHeader, Panel } from "@/components/admin/ui";
import { supabaseService } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Sent email" };
export const instant = false;

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" });

export default async function SentEmailPage({ params }: PageProps<"/admin/emails/sent/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: email } = await supabaseService().from("email_log")
    .select("id, recipient_email, template, subject, html, sent_at, error, related_kind")
    .eq("id", id).maybeSingle();
  if (!email) notFound();

  return (
    <Container className="py-8">
      <p className="m-0 pb-2 text-sm"><Link href="/admin/emails" className="font-bold underline">← All emails</Link></p>
      <PageHeader title={email.subject ?? "Sent email"} description={`To ${email.recipient_email} · ${when.format(new Date(email.sent_at))}`} />
      {email.error ? <div className="pb-5"><Notice>This email failed to send: {email.error}</Notice></div> : null}
      <Panel className="overflow-hidden">
        {email.html ? (
          <>
            {email.template === "fair_ticket_confirmation" ? <p className="m-0 border-b border-blush p-3 text-sm text-periwinkle">The QR code was sent as an attachment, so it doesn’t show in this copy.</p> : null}
            <iframe title="Copy of the sent email" srcDoc={email.html} sandbox="" className="h-[900px] w-full border-0 bg-white" />
          </>
        ) : <p className="m-0 p-8 text-center text-periwinkle">A copy wasn’t saved for this email (it was sent before copies were kept).</p>}
      </Panel>
    </Container>
  );
}
