-- Christmas Fair: the Acres Christmas Day dinner is no longer happening.
-- Family entry donations now go to a charity Trybe will announce soon.
-- Updates the stored copy that still mentions the dinner. Safe to run twice.

update public.events
   set description = 'Saturday 19 December, 12–5pm at Acres, 12 Acklam Road, London W10 5QZ. Entry by donation (£2 adults, £1 children), all going to a charity we’ll announce soon.'
 where slug = 'christmas-fair-2026';

-- Only touches the ticket confirmation template if an admin has saved an
-- edited copy that still mentions the dinner; otherwise the code default
-- (already updated) is used.
update public.email_templates
   set body = replace(
         body,
         'goes to Acres, who are putting on a Christmas Day dinner for people having a tough year.',
         'goes to charity. We’ll let you know which one when we announce it.'
       ),
       updated_at = now()
 where key = 'fair_ticket_confirmation'
   and body like '%Christmas Day dinner%';
