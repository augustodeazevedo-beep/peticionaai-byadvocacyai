
-- office_brand table
create table if not exists public.office_brand (
  user_id uuid primary key,
  firm_name text,
  logo_url text,
  primary_color text default '#283753',
  secondary_color text default '#6E59A5',
  font_family text default 'Arial',
  address text,
  phone text,
  email text,
  website text,
  oab_registration text,
  letterhead_enabled boolean not null default true,
  letterhead_layout text not null default 'topo',
  signature_block text,
  closing_text text default 'Nestes termos, pede deferimento.',
  default_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.office_brand enable row level security;

create policy "office_brand own select" on public.office_brand for select using (auth.uid() = user_id);
create policy "office_brand own insert" on public.office_brand for insert with check (auth.uid() = user_id);
create policy "office_brand own update" on public.office_brand for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "office_brand own delete" on public.office_brand for delete using (auth.uid() = user_id);

create trigger office_brand_set_updated_at
before update on public.office_brand
for each row execute function public.set_updated_at();

-- piece columns
alter table public.pieces
  add column if not exists brand_overrides jsonb not null default '{}'::jsonb,
  add column if not exists assembly_options jsonb not null default '{}'::jsonb;

-- public bucket for office logos
insert into storage.buckets (id, name, public)
values ('office-brand', 'office-brand', true)
on conflict (id) do nothing;

create policy "office-brand public read"
on storage.objects for select
using (bucket_id = 'office-brand');

create policy "office-brand owner insert"
on storage.objects for insert
with check (bucket_id = 'office-brand' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "office-brand owner update"
on storage.objects for update
using (bucket_id = 'office-brand' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "office-brand owner delete"
on storage.objects for delete
using (bucket_id = 'office-brand' and auth.uid()::text = (storage.foldername(name))[1]);
