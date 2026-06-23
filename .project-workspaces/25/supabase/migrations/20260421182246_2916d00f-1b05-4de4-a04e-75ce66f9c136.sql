create table public.push_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  notification_id uuid,
  user_id uuid,
  endpoint_hash text,
  status_code integer,
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index push_events_created_at_idx on public.push_events (created_at desc);
create index push_events_event_type_idx on public.push_events (event_type);
create index push_events_user_id_idx on public.push_events (user_id);

alter table public.push_events enable row level security;

create policy "Admins can view push events"
  on public.push_events for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));