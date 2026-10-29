"use client";

import { useState } from "react";
import { Field } from "@/components/form/field";
import { TextInput } from "@/components/form/text-input";
import { RadioTile } from "@/components/form/radio-tile";
import { RadioTileGroup } from "@/components/form/radio-tile-group";
import { Checkbox } from "@/components/form/checkbox";

/**
 * Internal preview of the booking form primitives. Rendered on two surfaces
 * (night, and a white card) because the booking form may sit on either.
 * `prefix` keeps ids and radio names unique between the two copies.
 */
function Examples({ prefix }: { prefix: string }) {
  const [slot, setSlot] = useState("morning");
  const [agreed, setAgreed] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <Field label="Child's first name" htmlFor={`${prefix}-first-name`} required className="flex-[2]">
          <TextInput
            id={`${prefix}-first-name`}
            name="firstName"
            defaultValue="Amara"
            autoComplete="off"
            required
          />
        </Field>
        <Field label="Age" htmlFor={`${prefix}-age`} className="flex-1">
          <TextInput
            id={`${prefix}-age`}
            name="age"
            inputMode="numeric"
            defaultValue="7"
          />
        </Field>
      </div>

      <Field
        label="Parent email"
        htmlFor={`${prefix}-email`}
        hint="We will send your booking confirmation here."
        error="Enter a valid email address, like name@example.com."
      >
        <TextInput
          id={`${prefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue="amara@"
          aria-invalid="true"
          aria-describedby={`${prefix}-email-hint ${prefix}-email-error`}
        />
      </Field>

      <RadioTileGroup legend="Preferred time" name={`${prefix}-time`}>
        <RadioTile
          name={`${prefix}-time`}
          value="morning"
          label="Morning"
          hint="9:00 am – 12:00 pm"
          checked={slot === "morning"}
          onChange={(e) => setSlot(e.target.value)}
        />
        <RadioTile
          name={`${prefix}-time`}
          value="afternoon"
          label="Afternoon"
          hint="2:30 pm – 5:00 pm"
          checked={slot === "afternoon"}
          onChange={(e) => setSlot(e.target.value)}
        />
      </RadioTileGroup>

      <Checkbox
        id={`${prefix}-terms`}
        name="terms"
        label="I agree to the terms"
        checked={agreed}
        onChange={(e) => setAgreed(e.target.checked)}
      />
    </div>
  );
}

export default function FormsPreviewPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 md:py-24">
      <h1 className="display text-[56px] md:text-[88px]">Form primitives preview</h1>
      <p className="mt-4 max-w-xl text-[19px] leading-7">
        Field, TextInput, RadioTile, RadioTileGroup and Checkbox, shown on the
        night backdrop and on a white card.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="surface-night">
          <h2 id="surface-night" className="mb-3 text-[24px] font-extrabold">
            On night
          </h2>
          <div data-theme="studio-stars" className="rounded-card bg-night p-8 text-white">
            <Examples prefix="night" />
          </div>
        </section>

        <section aria-labelledby="surface-card">
          <h2 id="surface-card" className="mb-3 text-[24px] font-extrabold">
            On white card
          </h2>
          <div
            data-theme="studio-stars"
            className="rounded-card border-[1.5px] border-blush bg-white p-8 text-night"
          >
            <Examples prefix="card" />
          </div>
        </section>
      </div>
    </div>
  );
}
