"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/form/checkbox";
import { Field } from "@/components/form/field";
import { RadioTile } from "@/components/form/radio-tile";
import { RadioTileGroup } from "@/components/form/radio-tile-group";
import { TextInput } from "@/components/form/text-input";
import { createBookingSession } from "./actions";
import type { BookingInput, BookingResult } from "./schema";
import {
  MAX_CHILD_AGE,
  MIN_CHILD_AGE,
  SIBLING_DISCOUNT_PERCENT,
  SIBLING_PRICE_PENCE,
  calculateTotal,
  formatGbp,
} from "./pricing";

/*
 * Four-step wizard, matching Booking.dc.html:
 *   1 children -> 2 preferred time -> 3 your details -> 4 review & pay -> 5 confirmation
 *
 * One real <form>. Steps 1-3 "submit" to advance (so native `required` / email
 * validation and the Enter key work per step); step 4 submit calls the Server
 * Action. Copy is taken verbatim from the design.
 */

export type BookingEvent = {
  name: string;
  dateLabel: string;
  venue: string;
  parking: string;
};

type TimeSlot = BookingInput["timeSlot"];
type Attendance = BookingInput["attendance"];
type Step = 1 | 2 | 3 | 4 | 5;
type KidDraft = { firstName: string; age: string };
type FieldErrors = Record<string, string>;

/** The design offers 1-4 children; the server accepts up to MAX_CHILDREN_PER_BOOKING. */
const COUNT_OPTIONS = [1, 2, 3, 4] as const;

const STEP_LABELS = ["Your children", "Preferred time", "Your details", "Review & pay"] as const;

const TIME_WINDOWS = [
  { id: "morning", label: "Morning", range: "9:00 am – 12:00 pm" },
  { id: "midday", label: "Midday", range: "12:00 pm – 2:30 pm" },
  { id: "afternoon", label: "Afternoon", range: "2:30 pm – 5:00 pm" },
  { id: "any", label: "No preference", range: "Any time, 9:00 am – 5:00 pm" },
] as const satisfies ReadonlyArray<{ id: TimeSlot; label: string; range: string }>;

const emptyKids = (): KidDraft[] =>
  COUNT_OPTIONS.map(() => ({ firstName: "", age: "" }));

/** Which step owns a given server error key, so we can send the parent back to fix it. */
function stepForErrors(errors: FieldErrors): Step {
  const keys = Object.keys(errors);
  if (keys.some((k) => k.startsWith("children"))) return 1;
  if (keys.includes("timeSlot")) return 2;
  const detailKeys = ["parentName", "parentEmail", "parentPhone", "attendance", "agreeToTerms"];
  if (keys.some((k) => detailKeys.includes(k))) return 3;
  return 4;
}

/** aria wiring for a Field-wrapped input (Field renders the error as `${id}-error`). */
const invalidProps = (id: string, error?: string) => ({
  "aria-invalid": error ? (true as const) : undefined,
  "aria-describedby": error ? `${id}-error` : undefined,
});

export function BookingForm({ event }: { event: BookingEvent }) {
  const [step, setStep] = useState<Step>(1);
  const [count, setCount] = useState<number>(1);
  const [kids, setKids] = useState<KidDraft[]>(emptyKids);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("any");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [attendance, setAttendance] = useState<Attendance>("stay");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  // Move focus to the new step's heading after a step change (not on first load).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  useEffect(() => {
    if (focusHeading.current) {
      focusHeading.current = false;
      headingRef.current?.focus();
    }
  }, [step]);

  const { subtotalPence, lines } = calculateTotal(count);
  const activeKids = kids.slice(0, count);
  const timeLabel = TIME_WINDOWS.find((w) => w.id === timeSlot)?.label ?? "No preference";

  function goTo(next: Step) {
    focusHeading.current = true;
    setStep(next);
  }

  function clearError(key: string) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateKid(index: number, field: keyof KidDraft, value: string) {
    setKids((prev) => prev.map((k, i) => (i === index ? { ...k, [field]: value } : k)));
    clearError(`children.${index}.${field}`);
  }

  /** Client-side check for step 1 so ages are caught before the review step. */
  function validateChildren(): FieldErrors {
    const found: FieldErrors = {};
    activeKids.forEach((kid, i) => {
      if (!kid.firstName.trim()) found[`children.${i}.firstName`] = "Please enter your child’s first name";
      const age = Number(kid.age);
      if (!kid.age || age < MIN_CHILD_AGE || age > MAX_CHILD_AGE) {
        found[`children.${i}.age`] = `Age must be between ${MIN_CHILD_AGE} and ${MAX_CHILD_AGE}`;
      }
    });
    return found;
  }

  function submitBooking() {
    setErrors({});
    const payload = {
      children: activeKids.map((k) => ({ firstName: k.firstName.trim(), age: k.age })),
      timeSlot,
      parentName,
      parentEmail,
      parentPhone,
      attendance,
      agreeToTerms: agree,
    };

    startTransition(async () => {
      let result: BookingResult;
      try {
        result = await createBookingSession(payload);
      } catch {
        result = { ok: false, errors: { form: "Something went wrong. Please try again." } };
      }

      if (result.ok) {
        // Phase 3: checkoutUrl is Stripe's absolute URL, so we leave the site.
        if (/^https?:\/\//.test(result.checkoutUrl)) {
          window.location.assign(result.checkoutUrl);
          return;
        }
        // Phase 2 stub: relative URL, show the confirmation in place.
        goTo(5);
        return;
      }

      setErrors(result.errors);
      goTo(stepForErrors(result.errors));
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) {
      const found = validateChildren();
      if (Object.keys(found).length > 0) {
        setErrors(found);
        return;
      }
    }
    if (step < 4) {
      goTo((step + 1) as Step);
      return;
    }
    if (step === 4) submitBooking();
  }

  function startNewBooking() {
    setCount(1);
    setKids(emptyKids());
    setTimeSlot("any");
    setParentName("");
    setParentEmail("");
    setParentPhone("");
    setAttendance("stay");
    setAgree(false);
    setErrors({});
    goTo(1);
  }

  return (
    <div className="flex flex-col gap-7">
      {step < 5 ? <StepIndicator current={step as 1 | 2 | 3 | 4} /> : null}

      <div className="flex flex-wrap items-start gap-5">
        <section className="flex min-w-0 flex-[2_1_560px] flex-col gap-7 rounded-block border-[1.5px] border-blush bg-white p-[clamp(24px,4vw,40px)] text-night">
          {step === 5 ? (
            <Confirmation
              headingRef={headingRef}
              event={event}
              firstName={parentName.trim().split(/\s+/)[0] ?? ""}
              email={parentEmail.trim()}
              onRestart={startNewBooking}
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-7">
              {/* STEP 1: children */}
              {step === 1 ? (
                <div className="flex flex-col gap-[26px]">
                  <StepHeading
                    headingRef={headingRef}
                    title="Who’s taking the stage?"
                    subtitle="Tell us how many children you’re booking, with their names and ages."
                  />

                  <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
                    <legend className="mb-3 p-0 text-[18px] font-extrabold">Number of children</legend>
                    <div className="flex flex-wrap gap-[10px]">
                      {COUNT_OPTIONS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={n === count}
                          onClick={() => setCount(n)}
                          className={[
                            "min-h-[56px] min-w-[64px] cursor-pointer rounded-[16px] border-[1.5px]",
                            "text-[20px] font-extrabold transition-colors duration-150",
                            n === count
                              ? "border-night bg-night text-white"
                              : "border-[color:var(--border-plum)] bg-white text-night hover:bg-cream",
                          ].join(" ")}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {count > 1 ? (
                      <p className="m-0 inline-flex items-center gap-2 self-start rounded-input bg-cream px-[14px] py-2 text-[16px] font-bold text-night">
                        <Sparkle size={18} />
                        Sibling discount: each additional child is {SIBLING_DISCOUNT_PERCENT}% off (
                        {formatGbp(SIBLING_PRICE_PENCE)})
                      </p>
                    ) : null}
                  </fieldset>

                  {activeKids.map((kid, i) => {
                    const nameId = `kid-name-${i}`;
                    const ageId = `kid-age-${i}`;
                    const nameError = errors[`children.${i}.firstName`];
                    const ageError = errors[`children.${i}.age`];
                    return (
                      <fieldset
                        key={i}
                        className="m-0 flex min-w-0 flex-wrap gap-4 rounded-[24px] border-[1.5px] border-[color:var(--border-lilac)] px-6 pb-6 pt-[22px]"
                      >
                        <legend className="px-2 text-[17px] font-extrabold text-trybe-purple">
                          Child {i + 1}
                        </legend>
                        <Field
                          label="Child’s first name"
                          htmlFor={nameId}
                          error={nameError}
                          className="flex-[2_1_220px]"
                        >
                          <TextInput
                            id={nameId}
                            name={`children.${i}.firstName`}
                            autoComplete="off"
                            required
                            maxLength={50}
                            value={kid.firstName}
                            onChange={(e) => updateKid(i, "firstName", e.target.value)}
                            {...invalidProps(nameId, nameError)}
                          />
                        </Field>
                        <Field label="Age" htmlFor={ageId} error={ageError} className="flex-[1_1_120px]">
                          <TextInput
                            id={ageId}
                            name={`children.${i}.age`}
                            inputMode="numeric"
                            autoComplete="off"
                            required
                            value={kid.age}
                            onChange={(e) =>
                              updateKid(i, "age", e.target.value.replace(/\D/g, "").slice(0, 2))
                            }
                            {...invalidProps(ageId, ageError)}
                          />
                        </Field>
                      </fieldset>
                    );
                  })}

                  <p className="m-0 flex items-start gap-[10px] rounded-[18px] bg-blush px-[18px] py-4 text-[17px] leading-[1.45] text-[color:var(--muted-plum)]">
                    <MusicIcon />
                    <span>
                      No need to pick a song yet — after booking, we’ll email you Trybe’s Christmas
                      song list to choose from.
                    </span>
                  </p>
                </div>
              ) : null}

              {/* STEP 2: preferred time (no public availability) */}
              {step === 2 ? (
                <div className="flex flex-col gap-6">
                  <StepHeading
                    headingRef={headingRef}
                    title="When suits you best?"
                    subtitle="Choose a preferred time of day. We’ll confirm the exact session time by email."
                  />
                  <RadioTileGroup legend="Preferred time of day" name="timeSlot" columns={2}>
                    {TIME_WINDOWS.map((w) => (
                      <RadioTile
                        key={w.id}
                        name="timeSlot"
                        value={w.id}
                        label={w.label}
                        hint={w.range}
                        checked={timeSlot === w.id}
                        onChange={() => {
                          setTimeSlot(w.id);
                          clearError("timeSlot");
                        }}
                      />
                    ))}
                  </RadioTileGroup>
                  {errors.timeSlot ? <ErrorText>{errors.timeSlot}</ErrorText> : null}
                  <div className="flex flex-wrap gap-[10px]">
                    {[
                      "Recording starts from 9:00 am",
                      "20-minute sessions",
                      "10-minute buffers between sessions",
                    ].map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center rounded-pill bg-blush px-[14px] py-2 text-[16px] font-bold text-indigo"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* STEP 3: parent details */}
              {step === 3 ? (
                <div className="flex flex-col gap-6">
                  <StepHeading
                    headingRef={headingRef}
                    title="Your details"
                    subtitle="Your confirmation, song list and session details will all be sent to this email."
                  />
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
                    <Field
                      label="Parent or guardian full name"
                      htmlFor="parent-name"
                      error={errors.parentName}
                      className="col-span-full"
                    >
                      <TextInput
                        id="parent-name"
                        name="parentName"
                        autoComplete="name"
                        required
                        maxLength={100}
                        value={parentName}
                        onChange={(e) => {
                          setParentName(e.target.value);
                          clearError("parentName");
                        }}
                        {...invalidProps("parent-name", errors.parentName)}
                      />
                    </Field>
                    <Field label="Email address" htmlFor="parent-email" error={errors.parentEmail}>
                      <TextInput
                        id="parent-email"
                        name="parentEmail"
                        type="email"
                        autoComplete="email"
                        required
                        value={parentEmail}
                        onChange={(e) => {
                          setParentEmail(e.target.value);
                          clearError("parentEmail");
                        }}
                        {...invalidProps("parent-email", errors.parentEmail)}
                      />
                    </Field>
                    <Field label="Mobile number" htmlFor="parent-phone" error={errors.parentPhone}>
                      <TextInput
                        id="parent-phone"
                        name="parentPhone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={parentPhone}
                        onChange={(e) => {
                          setParentPhone(e.target.value);
                          clearError("parentPhone");
                        }}
                        {...invalidProps("parent-phone", errors.parentPhone)}
                      />
                    </Field>
                  </div>

                  <RadioTileGroup legend="On the day, will you…" name="attendance" columns={2}>
                    <RadioTile
                      name="attendance"
                      value="stay"
                      label="Stay with my child"
                      checked={attendance === "stay"}
                      onChange={() => setAttendance("stay")}
                    />
                    <RadioTile
                      name="attendance"
                      value="drop"
                      label="Drop my child off"
                      checked={attendance === "drop"}
                      onChange={() => setAttendance("drop")}
                    />
                  </RadioTileGroup>

                  <div className="flex flex-col gap-2">
                    <Checkbox
                      id="agree-terms"
                      name="agreeToTerms"
                      required
                      checked={agree}
                      onChange={(e) => {
                        setAgree(e.target.checked);
                        clearError("agreeToTerms");
                      }}
                      {...invalidProps("agree-terms", errors.agreeToTerms)}
                      label={
                        <>
                          I agree to Trybe’s <Tbc>[booking terms &amp; privacy policy — links TBC]</Tbc>
                        </>
                      }
                    />
                    {errors.agreeToTerms ? (
                      <ErrorText id="agree-terms-error">{errors.agreeToTerms}</ErrorText>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* STEP 4: review & pay */}
              {step === 4 ? (
                <div className="flex flex-col gap-[22px]">
                  <StepHeading
                    headingRef={headingRef}
                    title="Review & pay"
                    subtitle="Check everything looks right, then pay securely with Stripe."
                  />
                  <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
                    {activeKids.map((kid, i) => {
                      const line = lines[i];
                      return (
                        <li
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[18px] bg-blush px-5 py-4"
                        >
                          <span className="flex flex-col">
                            <strong className="text-[19px]">{kid.firstName.trim() || `Child ${i + 1}`}</strong>
                            <span className="text-[16px] text-[color:var(--muted-plum)]">
                              {kid.age.trim() ? `Age ${kid.age.trim()}` : "Age not entered"} · Song chosen
                              after booking
                            </span>
                          </span>
                          <span className="flex flex-col items-end">
                            <strong className="text-[19px]">{formatGbp(line.pricePence)}</strong>
                            {line.labelKey === "sibling" ? (
                              <span className="text-[14px] text-[color:var(--muted-plum)]">
                                (sibling −{SIBLING_DISCOUNT_PERCENT}%)
                              </span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex flex-col gap-1 text-[17px] text-[color:var(--muted-plum)]">
                    <span>
                      <strong className="text-night">Preferred time:</strong> {timeLabel} — exact time
                      confirmed by email
                    </span>
                    <span>
                      <strong className="text-night">Contact:</strong>{" "}
                      {[parentName, parentEmail, parentPhone].filter((s) => s.trim()).join(" · ") ||
                        "Not entered yet"}
                    </span>
                    <span>
                      <strong className="text-night">On the day:</strong>{" "}
                      {attendance === "stay" ? "Staying with my child" : "Dropping my child off"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-night px-6 py-[22px] text-white">
                    <span className="flex items-center gap-3">
                      <LockIcon />
                      <span className="flex flex-col">
                        <strong className="text-[18px]">Secure payment with Stripe</strong>
                        <span className="text-[15px] text-[color:var(--border-lilac)]">
                          You’ll pay the full amount at Stripe’s secure checkout.
                        </span>
                      </span>
                    </span>
                    <span className="display text-[36px]">{formatGbp(subtotalPence)}</span>
                  </div>
                </div>
              ) : null}

              {errors.form ? <ErrorText>{errors.form}</ErrorText> : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blush pt-6">
                {step > 1 ? (
                  <Button variant="outline" onClick={() => goTo((step - 1) as Step)} disabled={isPending}>
                    Back
                  </Button>
                ) : (
                  <span aria-hidden="true" />
                )}
                <Button type="submit" variant="studio-stars" disabled={isPending}>
                  {isPending
                    ? "Preparing checkout…"
                    : step === 4
                      ? `Pay ${formatGbp(subtotalPence)} with Stripe`
                      : "Continue"}
                </Button>
              </div>
            </form>
          )}
        </section>

        {/* SUMMARY */}
        <aside aria-label="Booking summary" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <div className="relative flex flex-col gap-5 overflow-hidden rounded-block bg-night p-7 text-white">
            <Sparkle size={34} className="absolute right-6 top-6 text-sunshine" />
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-extrabold uppercase tracking-[0.1em] text-sunshine">
                Your booking
              </span>
              <span className="display text-[38px]">{event.name}</span>
              <span className="text-[16px] text-[color:var(--border-lilac)]">
                {event.dateLabel} · {event.venue} · {event.parking}
              </span>
              <span className="text-[16px] text-[color:var(--border-lilac)]">
                Preferred time: {timeLabel}
              </span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[16px]">
              {lines.map((line, i) => (
                <li key={line.position} className="flex justify-between gap-3">
                  <span>
                    {activeKids[i].firstName.trim() || `Child ${line.position}`}{" "}
                    {line.labelKey === "sibling" ? (
                      <span className="text-[color:var(--border-lilac)]">
                        (sibling −{SIBLING_DISCOUNT_PERCENT}%)
                      </span>
                    ) : null}
                  </span>
                  <span className="font-bold">{formatGbp(line.pricePence)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between border-t border-white/20 pt-[14px]">
              <span className="text-[17px] font-extrabold">Total due today</span>
              <span aria-live="polite" className="display text-[40px]">
                {formatGbp(subtotalPence)}
              </span>
            </div>
            <span className="text-[14px] text-[color:var(--border-lilac)]">Paid in full via Stripe</span>
          </div>

          <div className="flex flex-col gap-[6px] rounded-[24px] border-[1.5px] border-blush bg-white px-6 py-5 text-[16px] leading-[1.45] text-[color:var(--muted-plum)]">
            <strong className="text-night">Good to know</strong>
            <span>Each child has their own 20-minute session.</span>
            <span>Songs are chosen after booking, from a list we email you.</span>
            <span>You can stay with your child or drop them off.</span>
            <span>
              <Tbc>[Cancellation &amp; refund policy — TBC]</Tbc>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Local presentational helpers ─────────────────────────────── */

function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <>
      {/* Phones: one compact line instead of four stacked pills. */}
      <p className="m-0 text-[17px] font-bold sm:hidden">
        Step {current} of {STEP_LABELS.length}: {STEP_LABELS[current - 1]}
      </p>
      <ol
        aria-label="Booking progress"
        className="m-0 hidden list-none grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-[10px] p-0 sm:grid"
      >
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = current > num;
          const isCurrent = current === num;
          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className={[
                "flex items-center gap-3 rounded-pill border-[1.5px] px-4 py-[10px]",
                isCurrent ? "border-night bg-night text-white" : "border-blush bg-white text-night",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "flex size-8 flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-night",
                  isCurrent || done ? "bg-sunshine" : "bg-blush",
                ].join(" ")}
              >
                {done ? <CheckIcon size={16} /> : num}
              </span>
              <span className="text-[17px] font-bold">
                {label}
                {done ? <span className="sr-only"> (completed)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function StepHeading({
  title,
  subtitle,
  headingRef,
}: {
  title: string;
  subtitle: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="m-0 text-[28px] font-extrabold focus:shadow-none focus:outline-none"
      >
        {title}
      </h2>
      <p className="text-[18px] text-[color:var(--muted-plum)]">{subtitle}</p>
    </div>
  );
}

function Confirmation({
  headingRef,
  event,
  firstName,
  email,
  onRestart,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  event: BookingEvent;
  firstName: string;
  email: string;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-5 py-3">
      <span
        aria-hidden="true"
        className="flex size-[72px] items-center justify-center rounded-full bg-sunshine text-night"
      >
        <CheckIcon size={36} strokeWidth={3} />
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="display m-0 text-[length:clamp(40px,6vw,56px)] focus:shadow-none focus:outline-none"
      >
        You’re booked in!
      </h2>
      <p className="text-[19px] leading-[1.55] text-[color:var(--muted-plum)]">
        Thank you{firstName ? `, ${firstName}` : ""}. We’ve sent your confirmation to{" "}
        <strong className="text-night">{email || "your email address"}</strong>.
      </p>
      {/* STUB notice. Remove in Phase 3 once Stripe + Supabase + email are wired. */}
      <p className="m-0 rounded-input border border-dashed border-lavender bg-white px-[14px] py-2 text-[15px] font-bold text-indigo">
        Prototype only: nothing was saved, charged or emailed.
      </p>
      <div className="flex w-full flex-col gap-3 rounded-[24px] bg-blush p-6">
        <strong className="text-[19px]">What happens next</strong>
        <ol className="m-0 flex list-decimal flex-col gap-2 pl-[22px] text-[17px] leading-[1.5] text-[color:var(--muted-plum)]">
          <li>Look out for Trybe’s Christmas song list in your inbox — your child picks their song from it.</li>
          <li>We’ll email the song details and arrangements, plus your exact session time.</li>
          <li>On the day, come to {event.venue} in time for your session. Parking is available.</li>
        </ol>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button as="a" href="/studio-stars" variant="studio-stars">
          Back to Studio Stars
        </Button>
        <Button variant="outline" onClick={onRestart}>
          Start a new booking
        </Button>
      </div>
    </div>
  );
}

/** Same chip as Field's error, for controls Field can't wrap (checkbox, tile groups, form-level). */
function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="m-0 self-start rounded-input bg-red-100 px-3 py-1 text-[15px] font-semibold leading-[1.45] text-red-900"
    >
      {children}
    </p>
  );
}

/** Dashed "to be confirmed" placeholder, as in the design. */
function Tbc({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[6px] border border-dashed border-lavender bg-blush px-[6px] text-indigo">
      {children}
    </span>
  );
}

function Sparkle({ size, className }: { size: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path
        d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon({ size, strokeWidth = 3 }: { size: number; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-px flex-none text-trybe-purple"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none text-sunshine"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
