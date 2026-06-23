-- Selah weekly cron: schedule a Sunday 09:00 UTC trigger that POSTs to
-- /api/public/hooks/selah-weekly. Auth via shared secret in app_settings.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Generate a cron shared secret if one doesn't exist yet.
insert into public.app_settings (setting_key, setting_value)
values ('cron_secret', jsonb_build_object('value', encode(extensions.gen_random_bytes(32), 'hex')))
on conflict (setting_key) do nothing;

-- Unschedule any prior version so this migration is idempotent.
do $$
begin
  perform cron.unschedule('selah-weekly');
exception when others then null;
end $$;

-- Schedule: every Sunday at 09:00 UTC.
select cron.schedule(
  'selah-weekly',
  '0 9 * * 0',
  $cron$
  select net.http_post(
    url := (select setting_value->>'value' from public.app_settings where setting_key = 'push_endpoint_base') || '/api/public/hooks/selah-weekly',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'secret', (select setting_value->>'value' from public.app_settings where setting_key = 'cron_secret')
    )
  );
  $cron$
);