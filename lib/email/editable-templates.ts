/**
 * Default copy for the Christmas Fair emails an admin can edit in
 * /admin/emails. Edits are stored in the email_templates table; when a
 * template has no row there, these defaults are used.
 *
 * Body text: separate paragraphs with a blank line. Placeholders such as
 * {{first_name}} are filled in when the email is sent. Booking details (the
 * QR code, prices, deadlines, addresses) are added automatically in a card
 * below the body, so they always match the booking.
 */
import type { EditableEmailKey } from "@/lib/supabase/types";

export type EditableTemplateCopy = {
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string | null;
};

export type Placeholder = { key: string; description: string; sample: string };

export type EditableTemplateDefinition = EditableTemplateCopy & {
  key: EditableEmailKey;
  name: string;
  description: string;
  /** Whether this email has a button (its link is set automatically). */
  hasButton: boolean;
  placeholders: Placeholder[];
};

const EVENT_PLACEHOLDERS: Placeholder[] = [
  { key: "event_date", description: "Fair date", sample: "Saturday 19 December 2026" },
  { key: "event_time", description: "Opening hours", sample: "12–5pm" },
  { key: "venue", description: "Venue and address", sample: "Acres, 12 Acklam Road, London W10 5QZ" },
];

const FAMILY_PLACEHOLDERS: Placeholder[] = [
  { key: "first_name", description: "Lead adult’s first name", sample: "Amara" },
  { key: "family_name", description: "Lead adult’s full name", sample: "Amara Okafor" },
  { key: "adults", description: "Number of adults", sample: "2" },
  { key: "children", description: "Number of children", sample: "3" },
  { key: "amount_paid", description: "Total donation paid", sample: "£12" },
  ...EVENT_PLACEHOLDERS,
];

const VENDOR_PLACEHOLDERS: Placeholder[] = [
  { key: "first_name", description: "Contact’s first name", sample: "Jordan" },
  { key: "contact_name", description: "Contact’s full name", sample: "Jordan Hayes" },
  { key: "business_name", description: "Business or stall name", sample: "Little Makers Club" },
  { key: "setup_time", description: "Set-up start time", sample: "11:15am" },
  { key: "packdown_time", description: "Pack-down finish time", sample: "5:45pm" },
  ...EVENT_PLACEHOLDERS,
];

export const EDITABLE_TEMPLATES: Record<EditableEmailKey, EditableTemplateDefinition> = {
  fair_ticket_confirmation: {
    key: "fair_ticket_confirmation",
    name: "Family ticket confirmation",
    description: "Sent when a family’s payment goes through. Includes their QR ticket.",
    hasButton: true,
    subject: "Your Trybe Christmas Fair ticket 🎄",
    heading: "You’re coming to the fair!",
    body: [
      "Hi {{first_name}},",
      "Thank you for booking. Your family ticket for the Trybe Christmas Fair is confirmed. Show the QR code below when you arrive. You can come any time between 12 and 5pm.",
      "Your entry donation of {{amount_paid}} goes to Acres, who are putting on a Christmas Day dinner for people having a tough year. Thank you for being part of it.",
      "See you on {{event_date}}!",
    ].join("\n\n"),
    buttonLabel: "View your ticket",
    placeholders: FAMILY_PLACEHOLDERS,
  },
  fair_ticket_reminder: {
    key: "fair_ticket_reminder",
    name: "Family reminder (day before)",
    description: "Sent to every confirmed family the day before the fair.",
    hasButton: true,
    subject: "Tomorrow: Trybe Christmas Fair at Acres 🎄",
    heading: "The fair is tomorrow!",
    body: [
      "Hi {{first_name}},",
      "We can’t wait to see your family at the Trybe Christmas Fair tomorrow, {{event_date}}, from {{event_time}} at {{venue}}. It’s right by the Westway, just off Portobello Road.",
      "Arrive any time and bring your QR ticket (on your phone is fine).",
    ].join("\n\n"),
    buttonLabel: "View your ticket",
    placeholders: FAMILY_PLACEHOLDERS,
  },
  fair_vendor_received: {
    key: "fair_vendor_received",
    name: "Vendor application received",
    description: "Sent as soon as a vendor submits their application.",
    hasButton: false,
    subject: "We’ve received your Trybe Christmas Fair application",
    heading: "Application received",
    body: [
      "Hi {{first_name}},",
      "Thanks for applying to bring {{business_name}} to the Trybe Christmas Fair on {{event_date}} at Acres. We’ll review your application and email you with our decision.",
      "There’s nothing to pay yet. If you’re approved, we’ll send you a link to book and pay for your table.",
    ].join("\n\n"),
    buttonLabel: null,
    placeholders: VENDOR_PLACEHOLDERS,
  },
  fair_vendor_approved: {
    key: "fair_vendor_approved",
    name: "Vendor approved (with payment link)",
    description: "Sent when you click Approve. The button takes the vendor to their payment page.",
    hasButton: true,
    subject: "You’re approved for the Trybe Christmas Fair: book your table",
    heading: "You’re approved!",
    body: [
      "Hi {{first_name}},",
      "Great news: {{business_name}} has been approved for the Trybe Christmas Fair on {{event_date}} at {{venue}}.",
      "To book your table, please pay {{table_price}} using the button below by {{payment_deadline}}. If we haven’t received your payment by then, your space will be offered to another vendor.",
      "Tables and chairs are provided. Set-up starts at {{setup_time}} and pack-down needs to be finished by {{packdown_time}}. Please make sure you have basic one-day event public liability insurance.",
    ].join("\n\n"),
    buttonLabel: "Book and pay for my table",
    placeholders: [
      ...VENDOR_PLACEHOLDERS,
      { key: "table_price", description: "Table price offered", sample: "£25" },
      { key: "payment_deadline", description: "Pay-by date and time", sample: "Sunday 22 November, 6:05pm" },
    ],
  },
  fair_vendor_declined: {
    key: "fair_vendor_declined",
    name: "Vendor declined",
    description: "Sent when you click Decline.",
    hasButton: false,
    subject: "Your Trybe Christmas Fair application",
    heading: "Thank you for applying",
    body: [
      "Hi {{first_name}},",
      "Thank you for applying to bring {{business_name}} to the Trybe Christmas Fair. We had lots of brilliant applications and, unfortunately, we can’t offer you a table this time.",
      "We’d love to hear from you for future Trybe events, so keep an eye on trybe.uk for what’s coming up.",
    ].join("\n\n"),
    buttonLabel: null,
    placeholders: VENDOR_PLACEHOLDERS,
  },
  fair_vendor_paid: {
    key: "fair_vendor_paid",
    name: "Vendor table booked",
    description: "Sent when a vendor’s table payment goes through.",
    hasButton: true,
    subject: "Your table is booked: Trybe Christmas Fair",
    heading: "Your table is booked!",
    body: [
      "Hi {{first_name}},",
      "Thank you, we’ve received your payment of {{amount_paid}} and your table for {{business_name}} is confirmed.",
      "The fair runs {{event_time}} on {{event_date}} at {{venue}}. Set-up starts at {{setup_time}} and pack-down needs to be finished by {{packdown_time}}. Tables and chairs are provided.",
      "If you’re selling paid sessions or experiences, please take and manage those bookings yourself. Remember to bring your one-day event public liability insurance details.",
      "We’ll be in touch closer to the day with any final details.",
    ].join("\n\n"),
    buttonLabel: "View your vendor page",
    placeholders: [
      ...VENDOR_PLACEHOLDERS,
      { key: "amount_paid", description: "Amount paid", sample: "£25" },
    ],
  },
};

export const EDITABLE_TEMPLATE_KEYS = Object.keys(EDITABLE_TEMPLATES) as EditableEmailKey[];

export function isEditableKey(value: string): value is EditableEmailKey {
  return Object.prototype.hasOwnProperty.call(EDITABLE_TEMPLATES, value);
}

/** Replace {{placeholder}} tokens. Unknown tokens are left as typed. */
export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
  );
}

export function sampleValues(key: EditableEmailKey): Record<string, string> {
  return Object.fromEntries(EDITABLE_TEMPLATES[key].placeholders.map((p) => [p.key, p.sample]));
}
