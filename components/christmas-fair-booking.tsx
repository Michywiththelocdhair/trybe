"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/form/checkbox";
import { Field } from "@/components/form/field";
import { TextInput } from "@/components/form/text-input";
import { createFamilyTicket, createVendorApplication } from "@/app/(site)/christmas-fair/actions";

const fieldClass = "flex flex-col gap-2";

export function ChristmasFairBooking({
  activeTab,
  familyTicketsRemaining,
  vendorPitchesRemaining,
}: {
  activeTab: "family" | "vendor";
  familyTicketsRemaining: number;
  vendorPitchesRemaining: number;
}) {
  const [tab, setTab] = useState(activeTab);
  return (
    <section className="flex min-w-0 flex-col gap-4 text-night">
      <div role="group" aria-label="Choose what you would like to do" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={tab === "family"} onClick={() => setTab("family")} className={`min-h-12 rounded-full border-2 px-6 font-extrabold transition-colors ${tab === "family" ? "border-[#C8312B] bg-[#C8312B] text-white" : "border-[#452C86] bg-white text-[#452C86] hover:bg-[#F4E7F3]"}`}>
          Free ticket
        </button>
        <button type="button" aria-pressed={tab === "vendor"} onClick={() => setTab("vendor")} className={`min-h-12 rounded-full border-2 px-6 font-extrabold transition-colors ${tab === "vendor" ? "border-[#1E5B47] bg-[#1E5B47] text-white" : "border-[#452C86] bg-white text-[#452C86] hover:bg-[#F4E7F3]"}`}>
          Vendor application
        </button>
      </div>
      <div aria-live="polite" className="flex flex-col gap-6 rounded-[28px] border-2 border-[#452C86] bg-white p-5 sm:p-8 lg:p-9">
      {tab === "family" ? (
        <FamilyTicketForm remaining={familyTicketsRemaining} />
      ) : (
        <VendorApplicationForm remaining={vendorPitchesRemaining} />
      )}
      </div>
    </section>
  );
}

function FamilyTicketForm({ remaining }: { remaining: number }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof createFamilyTicket>> | null>(null);
  const [pending, startTransition] = useTransition();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => setResult(await createFamilyTicket(data)));
  }
  if (result?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="display m-0 text-4xl">Your family ticket is reserved</h2>
        <p className="m-0 text-lg">{result.emailSent ? "We’ve emailed your QR ticket." : "Your ticket is saved. We’re preparing the QR ticket email; if it doesn’t arrive, contact trybeappuk@gmail.com."} We’ll send an event reminder on 18 December, with any venue and opening-time details confirmed by then.</p>
        <p className="m-0 rounded-xl bg-[#F4E7F3] p-4 font-bold">Ticket code: {result.ticketCode.slice(0, 8).toUpperCase()}</p>
        <Link className="font-bold underline" href={`/christmas-fair/ticket/${result.ticketCode}`}>Open your ticket</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <h2 className="m-0 text-[28px] font-extrabold">Get your free family ticket</h2>
        <p className="m-0 mt-1 text-[18px] text-[color:var(--muted-plum)]">One ticket covers your whole family. Your ticket will arrive by email with a QR code.</p>
      </div>
      {result && !result.ok ? <p role="alert" className="m-0 rounded-xl bg-red-100 p-4 font-semibold text-red-900">{result.error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Counter label="Adults" note="Including you" value={adults} onChange={(value) => setAdults(value)} min={1} max={8 - children} />
        <Counter label="Children" note="Just the number" value={children} onChange={(value) => setChildren(value)} min={0} max={8 - adults} accent />
      </div>
      <p className="m-0 -mt-2 text-sm text-[color:var(--muted-plum)]">Maximum 8 people per family ticket.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lead adult’s full name" htmlFor="family-name" className="sm:col-span-2"><TextInput id="family-name" name="familyName" autoComplete="name" required maxLength={100} /></Field>
        <Field label="Email address (your QR ticket goes here)" htmlFor="family-email"><TextInput id="family-email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
        <Field label="Mobile number (optional)" htmlFor="family-phone"><TextInput id="family-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} /></Field>
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />
      </div>
      <Checkbox id="family-agree" name="agreed" value="yes" required label={<span>I agree to Trybe’s <Link href="/terms" className="font-bold underline">Terms &amp; Conditions</Link> and have read the <Link href="/privacy" className="font-bold underline">Privacy Policy</Link>.</span>} />
      <div className="flex justify-end border-t-2 border-dashed border-[#F7C6DA] pt-5"><Button type="submit" disabled={pending || remaining < 1} className="min-h-14 bg-[#C8312B] px-7">{pending ? "Reserving ticket…" : remaining < 1 ? "Family tickets are full" : "Get my free ticket"}</Button></div>
    </form>
  );
}

function VendorApplicationForm({ remaining }: { remaining: number }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof createVendorApplication>> | null>(null);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("kids");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => setResult(await createVendorApplication(data)));
  }
  if (result?.ok) {
    return <div className="flex flex-col gap-4"><h2 className="display m-0 text-4xl">Application received</h2><p className="m-0 text-lg">Thank you. We’ll review your application. If it’s accepted, we’ll contact you and you can arrange the £20 pitch fee with us. No payment is taken now.</p></div>;
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div><h2 className="m-0 text-[28px] font-extrabold">Apply for a stall</h2><p className="m-0 mt-1 text-[18px] text-[color:var(--muted-plum)]">No payment now. If your application is accepted, we’ll contact you about the £20 pitch fee.</p></div>
      {result && !result.ok ? <p role="alert" className="m-0 rounded-xl bg-red-100 p-4 font-semibold text-red-900">{result.error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business or stall name" htmlFor="business-name"><TextInput id="business-name" name="businessName" autoComplete="organization" required maxLength={120} /></Field>
        <Field label="Your name" htmlFor="vendor-name"><TextInput id="vendor-name" name="contactName" autoComplete="name" required maxLength={100} /></Field>
        <Field label="Email address" htmlFor="vendor-email"><TextInput id="vendor-email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
        <Field label="Mobile number" htmlFor="vendor-phone"><TextInput id="vendor-phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} /></Field>
      </div>
      <fieldset className="border-0 p-0"><legend className="mb-2 font-extrabold">What kind of stall?</legend><div className="grid grid-cols-2 gap-2">{[["kids", "Children’s activity"], ["food", "Food & treats"], ["crafts", "Crafts & gifts"], ["other", "Something else"]].map(([value, label]) => <label key={value} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-sm font-bold ${category === value ? "border-[#452C86] bg-[#F4E7F3]" : "border-[#D9C8E3] bg-white"}`}><input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} className="accent-[#452C86]" />{label}</label>)}</div></fieldset>
      <label className={fieldClass}>Tell us about your stall<textarea name="description" required minLength={20} maxLength={2000} rows={4} className="w-full rounded-input border-[1.5px] border-[color:var(--border-plum)] bg-white p-4 text-[17px] text-night" placeholder="What you’ll sell or run, and how families can get involved." /></label>
      <Field label="Website or social link (optional)" htmlFor="vendor-website"><TextInput id="vendor-website" name="website" type="url" maxLength={500} /></Field>
      <fieldset className="grid gap-4 border-0 p-0 sm:grid-cols-2"><legend className="sr-only">Stall requirements</legend><RadioYesNo name="needsPower" label="Do you need power?" /><RadioYesNo name="insurance" label="Do you have public liability insurance?" /></fieldset>
      {category === "food" ? <Field label="Food hygiene rating" htmlFor="food-hygiene"><TextInput id="food-hygiene" name="foodHygieneRating" required maxLength={80} /></Field> : null}
      <p className="m-0 text-sm font-bold text-[color:var(--muted-plum)]">Applications close 10 December 2026.</p>
      <Checkbox id="vendor-agree" name="agreed" value="yes" required label={<span>I agree to Trybe’s <Link href="/terms" className="font-bold underline">Terms &amp; Conditions</Link> and have read the <Link href="/privacy" className="font-bold underline">Privacy Policy</Link>.</span>} />
      <div className="flex justify-end border-t-2 border-dashed border-[#F7C6DA] pt-5"><Button type="submit" disabled={pending || remaining < 1} className="min-h-14 bg-[#1E5B47] px-7">{pending ? "Sending application…" : remaining < 1 ? "All pitches are assigned" : "Send my application"}</Button></div>
    </form>
  );
}

function Counter({ label, note, value, onChange, min, max, accent = false }: { label: string; note: string; value: number; onChange: (value: number) => void; min: number; max: number; accent?: boolean }) {
  const color = accent ? "#C8312B" : "#452C86";
  return <div className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-[#D9C8E3] bg-white p-4"><span className="flex flex-col"><strong className="text-[19px]">{label}</strong><span className="text-[15px] text-[color:var(--muted-plum)]">{note}</span></span><span className="flex shrink-0 items-center gap-2"><button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex size-11 items-center justify-center rounded-full border-2 border-[#452C86] bg-white text-[26px] font-extrabold text-[#452C86] disabled:opacity-40">−</button><span aria-live="polite" className="min-w-7 text-center font-black text-[30px]">{value}</span><button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex size-11 items-center justify-center rounded-full border-0 text-[26px] font-extrabold text-white disabled:opacity-40" style={{ backgroundColor: color }}>+</button></span></div>;
}

function RadioYesNo({ name, label }: { name: string; label: string }) {
  return <fieldset className="flex flex-col gap-2 border-0 p-0"><legend className="font-bold">{label}</legend><div className="flex gap-5"><label className="flex items-center gap-2"><input type="radio" name={name} value="yes" required /> Yes</label><label className="flex items-center gap-2"><input type="radio" name={name} value="no" /> No</label></div></fieldset>;
}
