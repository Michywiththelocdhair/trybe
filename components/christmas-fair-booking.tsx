"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/form/checkbox";
import { Field } from "@/components/form/field";
import { TextInput } from "@/components/form/text-input";
import { startFamilyTicketCheckout, startVendorApplication } from "@/app/(site)/christmas-fair/actions";
import { FAIR, VENDOR_CATEGORIES, formatPence, minimumDonationPence } from "@/lib/christmas-fair/config";
import { checkVendorFiles, uploadVendorFiles, VendorFileFields } from "@/components/christmas-fair-vendor-uploads";

const fieldClass = "flex flex-col gap-2";
const EXTRA_OPTIONS = [0, 2, 5, 10];

export function ChristmasFairBooking({
  activeTab,
  familyTicketsRemaining,
  vendorPitchesRemaining,
  vendorApplicationsOpen,
  cancelled,
}: {
  activeTab: "family" | "vendor";
  familyTicketsRemaining: number;
  vendorPitchesRemaining: number;
  vendorApplicationsOpen: boolean;
  cancelled: boolean;
}) {
  const [tab, setTab] = useState(activeTab);
  return (
    <section className="flex min-w-0 flex-col gap-4 text-night">
      <div role="group" aria-label="Choose what you would like to do" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={tab === "family"} onClick={() => setTab("family")} className={`min-h-12 rounded-full border-2 px-6 font-extrabold transition-colors ${tab === "family" ? "border-[#C8312B] bg-[#C8312B] text-white" : "border-[#452C86] bg-white text-[#452C86] hover:bg-[#F4E7F3]"}`}>
          Family ticket
        </button>
        <button type="button" aria-pressed={tab === "vendor"} onClick={() => setTab("vendor")} className={`min-h-12 rounded-full border-2 px-6 font-extrabold transition-colors ${tab === "vendor" ? "border-[#1E5B47] bg-[#1E5B47] text-white" : "border-[#452C86] bg-white text-[#452C86] hover:bg-[#F4E7F3]"}`}>
          Vendor application
        </button>
      </div>
      <div aria-live="polite" className="flex flex-col gap-6 rounded-[28px] border-2 border-[#452C86] bg-white p-5 sm:p-8 lg:p-9">
        {tab === "family" ? (
          <FamilyTicketForm remaining={familyTicketsRemaining} cancelled={cancelled} />
        ) : (
          <VendorApplicationForm remaining={vendorPitchesRemaining} open={vendorApplicationsOpen} />
        )}
      </div>
    </section>
  );
}

function FamilyTicketForm({ remaining, cancelled }: { remaining: number; cancelled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [extraChoice, setExtraChoice] = useState<number | "custom">(0);
  const [customExtra, setCustomExtra] = useState("");
  const extraPounds = extraChoice === "custom" ? Math.max(0, Number.parseFloat(customExtra) || 0) : extraChoice;
  const extraPence = Math.round(extraPounds * 100);
  const minimumPence = minimumDonationPence(adults, children);
  const totalPence = minimumPence + extraPence;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await startFamilyTicketCheckout(data);
      if (result.ok) window.location.assign(result.url);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <h2 className="m-0 text-[28px] font-extrabold">Get your family ticket</h2>
        <p className="m-0 mt-1 text-[18px] text-[color:var(--muted-plum)]">One ticket covers your whole family. Entry is a donation of £2 per adult and £1 per child, and every penny goes to Acres’ Christmas Day dinner for people having a tough year.</p>
      </div>
      {cancelled ? <p role="status" className="m-0 rounded-xl bg-[#F4E7F3] p-4 font-semibold">Payment cancelled. Your ticket hasn’t been booked; you can try again below.</p> : null}
      {error ? <p role="alert" className="m-0 rounded-xl bg-red-100 p-4 font-semibold text-red-900">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Counter label="Adults" note="£2 each" value={adults} onChange={setAdults} min={1} max={FAIR.maxPeoplePerTicket - children} />
        <Counter label="Children" note="£1 each" value={children} onChange={setChildren} min={0} max={FAIR.maxPeoplePerTicket - adults} accent />
      </div>
      <p className="m-0 -mt-2 text-sm text-[color:var(--muted-plum)]">Maximum {FAIR.maxPeoplePerTicket} people per family ticket.</p>

      <fieldset className="flex flex-col gap-3 rounded-[18px] border-2 border-[#F7C6DA] bg-[#FBF5EC] p-4 sm:p-5">
        <legend className="px-1 font-extrabold">Add an extra donation? <span className="font-semibold text-[color:var(--muted-plum)]">(optional)</span></legend>
        <p className="m-0 text-[15px]">Want to give a little more? It all goes to Acres’ Christmas Day dinner.</p>
        <div className="flex flex-wrap gap-2">
          {EXTRA_OPTIONS.map((amount) => (
            <button key={amount} type="button" aria-pressed={extraChoice === amount} onClick={() => setExtraChoice(amount)} className={`min-h-11 rounded-full border-2 px-5 font-extrabold ${extraChoice === amount ? "border-[#C8312B] bg-[#C8312B] text-white" : "border-[#D9C8E3] bg-white text-[#452C86]"}`}>
              {amount === 0 ? "No thanks" : `+£${amount}`}
            </button>
          ))}
          <button type="button" aria-pressed={extraChoice === "custom"} onClick={() => setExtraChoice("custom")} className={`min-h-11 rounded-full border-2 px-5 font-extrabold ${extraChoice === "custom" ? "border-[#C8312B] bg-[#C8312B] text-white" : "border-[#D9C8E3] bg-white text-[#452C86]"}`}>Other amount</button>
        </div>
        {extraChoice === "custom" ? (
          <Field label="Extra donation (£)" htmlFor="extra-donation">
            <TextInput id="extra-donation" inputMode="decimal" type="text" pattern="[0-9]+(\.[0-9]{1,2})?" value={customExtra} onChange={(e) => setCustomExtra(e.currentTarget.value)} />
          </Field>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lead adult’s full name" htmlFor="family-name" className="sm:col-span-2"><TextInput id="family-name" name="familyName" autoComplete="name" required maxLength={100} /></Field>
        <Field label="Email address (your QR ticket goes here)" htmlFor="family-email"><TextInput id="family-email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
        <Field label="Mobile number (optional)" htmlFor="family-phone"><TextInput id="family-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} /></Field>
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />
        <input type="hidden" name="extraDonation" value={(extraPence / 100).toFixed(2)} />
      </div>

      <dl className="m-0 grid gap-1 rounded-[18px] bg-[#F4E7F3] p-4 text-[16px]">
        <div className="flex justify-between gap-4"><dt>{adults} {adults === 1 ? "adult" : "adults"} × £2</dt><dd className="m-0 font-bold">{formatPence(adults * FAIR.adultMinimumPence)}</dd></div>
        {children > 0 ? <div className="flex justify-between gap-4"><dt>{children} {children === 1 ? "child" : "children"} × £1</dt><dd className="m-0 font-bold">{formatPence(children * FAIR.childMinimumPence)}</dd></div> : null}
        {extraPence > 0 ? <div className="flex justify-between gap-4"><dt>Extra donation</dt><dd className="m-0 font-bold">{formatPence(extraPence)}</dd></div> : null}
        <div className="mt-2 flex justify-between gap-4 border-t-2 border-dashed border-[#BA85BA] pt-2 text-[19px]"><dt className="font-extrabold">Total donation to Acres</dt><dd className="m-0 font-black">{formatPence(totalPence)}</dd></div>
      </dl>

      <Checkbox id="family-agree" name="agreed" value="yes" required label={<span>I agree to Trybe’s <Link href="/terms" className="font-bold underline">Terms &amp; Conditions</Link> and have read the <Link href="/privacy" className="font-bold underline">Privacy Policy</Link>.</span>} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-[#F7C6DA] pt-5">
        <span className="text-sm font-semibold text-[color:var(--muted-plum)]">You’ll pay securely with Stripe.</span>
        <Button type="submit" disabled={pending || remaining < 1} className="min-h-14 bg-[#C8312B] px-7">{pending ? "Starting payment…" : remaining < 1 ? "Family tickets are sold out" : `Continue to payment · ${formatPence(totalPence)}`}</Button>
      </div>
    </form>
  );
}

function VendorApplicationForm({ remaining, open }: { remaining: number; open: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("kids");
  const [logo, setLogo] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [token, setToken] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const problem = checkVendorFiles(logo, photos, { requireLogo: true, requirePhotos: true });
    if (problem) return setError(problem);
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      // A retry after a failed upload reuses the application already saved.
      let vendorToken = token;
      if (!vendorToken) {
        setStatus("Sending your application…");
        const created = await startVendorApplication(data);
        if (!created.ok) {
          setStatus(null);
          return setError(created.error);
        }
        vendorToken = created.token;
        setToken(created.token);
      }
      setStatus("Uploading your logo and photos…");
      const uploaded = await uploadVendorFiles(vendorToken, logo, photos);
      setStatus(null);
      if (!uploaded.ok) return setError(`${uploaded.error} Your details are saved, so just press the button again.`);
      setDone(vendorToken);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="display m-0 text-4xl uppercase">Application received</h2>
        <p className="m-0 text-lg">Thank you! We’ve emailed you a copy. We’ll review your application and, if you’re approved, email you a link to book and pay for your table. You’ll then have {FAIR.vendorPaymentDays} days to pay.</p>
        <Link className="font-bold underline" href={`/christmas-fair/vendor/${done}`}>View your application</Link>
      </div>
    );
  }
  if (!open) {
    return <div className="flex flex-col gap-3"><h2 className="m-0 text-[28px] font-extrabold">Vendor applications have closed</h2><p className="m-0 text-lg">Applications closed on {FAIR.vendorDeadlineLabel}. Thank you for your interest. We’d love to hear from you for future Trybe events.</p></div>;
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <h2 className="m-0 text-[28px] font-extrabold">Apply for a table</h2>
        <p className="m-0 mt-1 text-[18px] text-[color:var(--muted-plum)]">No payment now. If you’re approved, we’ll email you a link to pay for your table: {formatPence(FAIR.earlyBirdPricePence)} early bird for the first {FAIR.earlyBirdTables} tables, then {formatPence(FAIR.standardPricePence)}.</p>
      </div>
      {error ? <p role="alert" className="m-0 rounded-xl bg-red-100 p-4 font-semibold text-red-900">{error}</p> : null}
      <fieldset disabled={Boolean(token)} className="m-0 flex flex-col gap-5 border-0 p-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business or stall name" htmlFor="business-name"><TextInput id="business-name" name="businessName" autoComplete="organization" required maxLength={120} /></Field>
          <Field label="Your name" htmlFor="vendor-name"><TextInput id="vendor-name" name="contactName" autoComplete="name" required maxLength={100} /></Field>
          <Field label="Email address" htmlFor="vendor-email"><TextInput id="vendor-email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
          <Field label="Mobile number" htmlFor="vendor-phone"><TextInput id="vendor-phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} /></Field>
        </div>
        <fieldset className="border-0 p-0">
          <legend className="mb-2 font-extrabold">What kind of stall?</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{VENDOR_CATEGORIES.map(({ value, label }) => <label key={value} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-sm font-bold ${category === value ? "border-[#452C86] bg-[#F4E7F3]" : "border-[#D9C8E3] bg-white"}`}><input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} className="accent-[#452C86]" />{label}{value === "kids" ? <span className="ml-auto rounded-full bg-[#F7C6DA] px-2 py-0.5 text-xs">Most wanted</span> : null}</label>)}</div>
          <p className="m-0 mt-2 text-sm font-semibold text-[color:var(--muted-plum)]">Food is very welcome, and hot drinks served alongside food are fine, but we’re not taking drinks-only stalls.</p>
        </fieldset>
        <label className={fieldClass}><span className="font-bold">Tell us about your stall</span><textarea name="description" required minLength={20} maxLength={2000} rows={4} className="w-full rounded-input border-[1.5px] border-[color:var(--border-plum)] bg-white p-4 text-[17px] text-night" placeholder="What you’ll sell or run, and how families can get involved. If you’re offering paid sessions or experiences, tell us here. You’ll take and manage those bookings yourself." /></label>
        <Field label="Website or social link (optional)" htmlFor="vendor-website"><TextInput id="vendor-website" name="website" type="url" maxLength={500} placeholder="https://" /></Field>
        <RadioYesNo name="needsPower" label="Do you need power at your table?" />
        <VendorFileFields logo={logo} photos={photos} onLogo={setLogo} onPhotos={setPhotos} requireLogo />
        <div className="flex flex-col gap-3">
          <Checkbox id="vendor-insurance" name="insurance" value="yes" required label={<span>I have, or will have by the day, basic one-day event public liability insurance.</span>} />
          <Checkbox id="vendor-no-drinks" name="noDrinksOnly" value="yes" required label={<span>My stall isn’t a drinks-only stall.</span>} />
          <Checkbox id="vendor-agree" name="agreed" value="yes" required label={<span>I agree to Trybe’s <Link href="/terms" className="font-bold underline">Terms &amp; Conditions</Link>, have read the <Link href="/privacy" className="font-bold underline">Privacy Policy</Link>, and I’m happy for Trybe and Acres to use my logo and photos to promote my stall.</span>} />
        </div>
      </fieldset>
      {status ? <p role="status" className="m-0 font-bold">{status}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-[#F7C6DA] pt-5">
        <span className="text-sm font-bold text-[color:var(--muted-plum)]">Applications close {FAIR.vendorDeadlineLabel}.</span>
        <Button type="submit" disabled={pending || remaining < 1} className="min-h-14 bg-[#1E5B47] px-7">{pending ? "Sending…" : remaining < 1 ? "All tables are taken" : token ? "Try the upload again" : "Send my application"}</Button>
      </div>
    </form>
  );
}

function Counter({ label, note, value, onChange, min, max, accent = false }: { label: string; note: string; value: number; onChange: (value: number) => void; min: number; max: number; accent?: boolean }) {
  const color = accent ? "#C8312B" : "#452C86";
  return <div className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-[#D9C8E3] bg-white p-4"><span className="flex flex-col"><strong className="text-[19px]">{label}</strong><span className="text-[15px] text-[color:var(--muted-plum)]">{note}</span></span><span className="flex shrink-0 items-center gap-2"><button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex size-11 items-center justify-center rounded-full border-2 border-[#452C86] bg-white text-[26px] font-extrabold text-[#452C86] disabled:opacity-40">−</button><span aria-live="polite" className="min-w-7 text-center font-black text-[30px]">{value}</span><button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex size-11 items-center justify-center rounded-full border-0 text-[26px] font-extrabold text-white disabled:opacity-40" style={{ backgroundColor: color }}>+</button></span></div>;
}

function RadioYesNo({ name, label }: { name: string; label: string }) {
  return <fieldset className="flex flex-col gap-2 border-0 p-0"><legend className="font-bold">{label}</legend><div className="flex gap-5"><label className="flex min-h-11 items-center gap-2"><input type="radio" name={name} value="yes" required /> Yes</label><label className="flex min-h-11 items-center gap-2"><input type="radio" name={name} value="no" /> No</label></div></fieldset>;
}
