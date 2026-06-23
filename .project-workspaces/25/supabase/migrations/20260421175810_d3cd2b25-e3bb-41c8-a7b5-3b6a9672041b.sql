alter table public.user_notification_settings
  add column if not exists service_window_day smallint,
  add column if not exists service_window_start smallint,
  add column if not exists service_window_end smallint;

-- Sanity bounds (0..6 day, 0..23 hour). Triggers used instead of CHECK to stay flexible.
create or replace function public.validate_service_window()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.service_window_day is not null and (new.service_window_day < 0 or new.service_window_day > 6) then
    raise exception 'service_window_day must be 0..6';
  end if;
  if new.service_window_start is not null and (new.service_window_start < 0 or new.service_window_start > 23) then
    raise exception 'service_window_start must be 0..23';
  end if;
  if new.service_window_end is not null and (new.service_window_end < 0 or new.service_window_end > 23) then
    raise exception 'service_window_end must be 0..23';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_service_window on public.user_notification_settings;
create trigger trg_validate_service_window
  before insert or update on public.user_notification_settings
  for each row execute function public.validate_service_window();