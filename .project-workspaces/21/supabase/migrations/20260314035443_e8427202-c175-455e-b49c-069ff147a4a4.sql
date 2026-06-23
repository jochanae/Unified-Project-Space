create table if not exists public.thread_connections (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid references auth.users(id) on delete cascade,
  invite_code text not null unique default substring(gen_random_uuid()::text, 1, 8),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.thread_connections enable row level security;

create policy "Users can view their own thread connections"
  on public.thread_connections for select
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

create policy "Users can create thread invites"
  on public.thread_connections for insert
  with check (auth.uid() = inviter_id);

create policy "Invitee can accept"
  on public.thread_connections for update
  using (auth.uid() = invitee_id);