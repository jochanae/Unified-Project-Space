-- Companion facts: things the user has learned about their companion through conversation
create table if not exists public.companion_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id text not null,
  text text not null,
  category text not null default 'general',
  extracted_at timestamptz not null default now(),
  source text not null default 'auto'
);

-- Index for fast lookups per user+companion
create index if not exists companion_facts_user_member_idx
  on public.companion_facts (user_id, member_id, extracted_at desc);

-- RLS
alter table public.companion_facts enable row level security;

create policy "Users can manage their own companion facts"
  on public.companion_facts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);