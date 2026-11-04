-- Track the internal Studio Stars booking notice so webhook retries are safe
-- and failed sends can be retried by the daily reminder job.
alter table public.email_log
  drop constraint if exists email_log_template_check;

alter table public.email_log
  add constraint email_log_template_check
  check (template in (
    'confirmation', 'reminder_48h', 'day_of', 'thank_you',
    'waitlist_opened', 'receipt', 'admin_booking'
  ));
