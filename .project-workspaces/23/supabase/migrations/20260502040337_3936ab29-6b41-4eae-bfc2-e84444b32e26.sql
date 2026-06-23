create table public.connected_social_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'twitter')),
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  platform_user_id text,
  platform_display_name text,
  platform_avatar_url text,
  scopes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, platform)
);

alter table public.connected_social_accounts enable row level security;

create policy "org members can read own connections"
  on public.connected_social_accounts for select
  using (org_id = public.get_user_org_id());

create policy "org members can insert own connections"
  on public.connected_social_accounts for insert
  with check (org_id = public.get_user_org_id());

create policy "org members can update own connections"
  on public.connected_social_accounts for update
  using (org_id = public.get_user_org_id());

create policy "org members can delete own connections"
  on public.connected_social_accounts for delete
  using (org_id = public.get_user_org_id());

create trigger update_connected_social_accounts_updated_at
  before update on public.connected_social_accounts
  for each row execute function public.update_updated_at_column();

create index idx_connected_social_accounts_org_platform
  on public.connected_social_accounts (org_id, platform);