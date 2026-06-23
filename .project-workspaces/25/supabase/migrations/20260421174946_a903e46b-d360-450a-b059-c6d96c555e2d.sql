-- Web Push trigger: when a notification row is inserted, POST its id to
-- /api/public/send-push so the server can fan it out via web-push.
--
-- Uses pg_net (async HTTP) so insert latency stays at zero.
-- A shared secret is stored in app_settings and verified by the route.

create extension if not exists pg_net;

-- Generate (once) and store the shared secret used to authenticate the trigger
-- to the send-push route. Will not overwrite if already present.
insert into public.app_settings (setting_key, setting_value)
values (
  'push_trigger_secret',
  jsonb_build_object('value', encode(extensions.gen_random_bytes(32), 'hex'))
)
on conflict (setting_key) do nothing;

-- Store the public base URL the trigger will POST to. Default to the stable
-- production URL; admin can override later via app_settings.
insert into public.app_settings (setting_key, setting_value)
values (
  'push_endpoint_base',
  jsonb_build_object('value', 'https://sanctumiq.app')
)
on conflict (setting_key) do nothing;

create or replace function public.notify_push_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_base text;
begin
  select setting_value->>'value' into v_secret
    from public.app_settings where setting_key = 'push_trigger_secret';
  select setting_value->>'value' into v_base
    from public.app_settings where setting_key = 'push_endpoint_base';

  if v_secret is null or v_base is null then
    return new;
  end if;

  perform net.http_post(
    url := v_base || '/api/public/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'notification_id', new.id::text,
      'secret', v_secret
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_push_after_insert on public.notifications;
create trigger trg_notify_push_after_insert
after insert on public.notifications
for each row execute function public.notify_push_after_insert();