
-- =========================================================
-- Notification system foundation (Scope B)
-- =========================================================

-- 1) user_notification_settings -----------------------------
create table public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'sanctuary' check (mode in ('sanctuary','guided','connected')),
  enabled boolean not null default true,
  quiet_hours_start int not null default 21 check (quiet_hours_start between 0 and 23),
  quiet_hours_end int not null default 7 check (quiet_hours_end between 0 and 23),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notification_settings enable row level security;

create policy "Users view own notification settings"
  on public.user_notification_settings for select
  to authenticated using (auth.uid() = user_id);

create policy "Users insert own notification settings"
  on public.user_notification_settings for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users update own notification settings"
  on public.user_notification_settings for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own notification settings"
  on public.user_notification_settings for delete
  to authenticated using (auth.uid() = user_id);

create trigger user_notification_settings_set_updated_at
  before update on public.user_notification_settings
  for each row execute function public.set_updated_at();

-- 2) notifications -----------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('sacred','personal','community')),
  title text not null,
  body text not null default '',
  silent boolean not null default true,
  priority text not null default 'low' check (priority in ('low','normal')),
  action_url text,
  scheduled_for timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_user_undelivered_idx
  on public.notifications (user_id, scheduled_for)
  where delivered_at is null;

alter table public.notifications enable row level security;

create policy "Users view own notifications"
  on public.notifications for select
  to authenticated using (auth.uid() = user_id);

create policy "Users insert own notifications"
  on public.notifications for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.notifications for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own notifications"
  on public.notifications for delete
  to authenticated using (auth.uid() = user_id);

-- 3) push_subscriptions (scaffolded for later) -------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users view own push subscriptions"
  on public.push_subscriptions for select
  to authenticated using (auth.uid() = user_id);

create policy "Users insert own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users delete own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated using (auth.uid() = user_id);

-- 4) Auto-create default settings on signup ----------------
create or replace function public.handle_new_user_notification_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_notification_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_notification_settings();

-- Backfill for existing users
insert into public.user_notification_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
