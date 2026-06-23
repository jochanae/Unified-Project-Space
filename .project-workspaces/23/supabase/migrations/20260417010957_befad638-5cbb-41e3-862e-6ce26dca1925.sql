create table public.lead_followups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  lead_notification_id uuid references public.lead_notifications(id) on delete set null,
  sent_by uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index lead_followups_org_id_idx on public.lead_followups(org_id, created_at desc);
create index lead_followups_lead_notification_id_idx on public.lead_followups(lead_notification_id);

alter table public.lead_followups enable row level security;

create policy "Org members can view their org follow-ups"
  on public.lead_followups for select
  to authenticated
  using (org_id = public.get_user_org_id());

create policy "Org members can insert follow-ups for their org"
  on public.lead_followups for insert
  to authenticated
  with check (org_id = public.get_user_org_id() and sent_by = auth.uid());