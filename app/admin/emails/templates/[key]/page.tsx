import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { canWrite, requireAdmin } from "@/components/admin/is-admin";
import { controlClass, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { EDITABLE_TEMPLATES, isEditableKey } from "@/lib/email/editable-templates";
import { loadTemplateCopy, renderTemplatePreview } from "@/lib/christmas-fair/emails";
import { resetEmailTemplate, saveEmailTemplate, sendTestEmail } from "../../actions";

export const metadata: Metadata = { title: "Edit email" };
export const instant = false;

const NOTICES: Record<string, { tone: "info" | "error"; text: string }> = {
  saved: { tone: "info", text: "Saved. All future emails of this type will use this wording." },
  reset: { tone: "info", text: "Back to the default wording." },
  "test-sent": { tone: "info", text: "Test email sent to your inbox (with sample details)." },
  "test-failed": { tone: "error", text: "The test email couldn’t be sent. Check the email settings and try again." },
};
const ERRORS: Record<string, string> = {
  invalid: "Please fill in the subject, heading and email text.",
  save: "That couldn’t be saved. Please try again.",
  readonly: "Your admin role is read-only.",
};

export default async function EditEmailTemplatePage({ params, searchParams }: PageProps<"/admin/emails/templates/[key]">) {
  const { admin } = await requireAdmin();
  const { key } = await params;
  if (!isEditableKey(key)) notFound();
  const query = await searchParams;
  const writable = canWrite(admin.role);
  const definition = EDITABLE_TEMPLATES[key];
  const copy = await loadTemplateCopy(key);
  const preview = await renderTemplatePreview(key, copy);
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;
  const error = typeof query.error === "string" ? ERRORS[query.error] : undefined;

  return (
    <Container className="py-8">
      <p className="m-0 pb-2 text-sm"><Link href="/admin/emails" className="font-bold underline">← All emails</Link></p>
      <PageHeader title={definition.name} description={definition.description} />
      {notice ? <div className="pb-5"><Notice tone={notice.tone}>{notice.text}</Notice></div> : null}
      {error ? <div className="pb-5"><Notice>{error}</Notice></div> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel className="p-5 sm:p-6">
          <h2 className="m-0 text-xl font-extrabold text-indigo">Wording</h2>
          <p className="mb-4 mt-1 text-sm text-periwinkle">{copy.edited ? "You’ve edited this email." : "This is the default wording."} Leave a blank line between paragraphs. Words in {"{{double_brackets}}"} are filled in automatically.</p>
          <form action={saveEmailTemplate} className="flex flex-col gap-4">
            <input type="hidden" name="key" value={key} />
            <label className="flex flex-col gap-1 text-sm font-bold">Subject line<input className={controlClass} name="subject" defaultValue={copy.subject} maxLength={200} required disabled={!writable} /></label>
            <label className="flex flex-col gap-1 text-sm font-bold">Heading<input className={controlClass} name="heading" defaultValue={copy.heading} maxLength={200} required disabled={!writable} /></label>
            <label className="flex flex-col gap-1 text-sm font-bold">Email text<textarea className={`${controlClass} min-h-[300px] py-3 leading-relaxed`} name="body" defaultValue={copy.body} maxLength={8000} required disabled={!writable} /></label>
            {definition.hasButton ? <label className="flex flex-col gap-1 text-sm font-bold">Button text<input className={controlClass} name="buttonLabel" defaultValue={copy.buttonLabel ?? ""} maxLength={60} disabled={!writable} /><span className="font-normal text-periwinkle">The button link is set automatically.</span></label> : null}
            {writable ? (
              <div className="flex flex-wrap gap-3">
                <button className="min-h-11 rounded-pill bg-indigo px-5 font-bold text-white">Save changes</button>
              </div>
            ) : null}
          </form>
          {writable ? (
            <div className="mt-4 flex flex-wrap gap-3 border-t border-blush pt-4">
              <form action={sendTestEmail}><input type="hidden" name="key" value={key} /><button className="min-h-11 rounded-pill border-[1.5px] border-indigo px-5 font-bold text-indigo">Send me a test</button></form>
              {copy.edited ? <form action={resetEmailTemplate}><input type="hidden" name="key" value={key} /><button className="min-h-11 rounded-pill border-[1.5px] border-red-800 px-5 font-bold text-red-800">Reset to default</button></form> : null}
            </div>
          ) : null}
          <h3 className="mb-2 mt-6 text-base font-extrabold text-indigo">Fill-in words you can use</h3>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm sm:grid-cols-2">
            {definition.placeholders.map((ph) => <li key={ph.key}><code className="rounded bg-blush px-1.5 py-0.5 font-bold text-indigo">{`{{${ph.key}}}`}</code> {ph.description}</li>)}
          </ul>
          <p className="mb-0 mt-4 text-sm text-periwinkle">The box of booking details (dates, prices, QR code and so on) is added automatically below the text.</p>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-blush p-4">
            <p className="m-0 text-xs font-extrabold uppercase tracking-widest text-periwinkle">Preview with sample details (saved version)</p>
            <p className="m-0 mt-1 font-bold text-indigo">Subject: {preview.subject}</p>
          </div>
          <iframe title={`Preview of ${definition.name}`} srcDoc={preview.html} sandbox="" className="h-[900px] w-full border-0 bg-white" />
        </Panel>
      </div>
    </Container>
  );
}
