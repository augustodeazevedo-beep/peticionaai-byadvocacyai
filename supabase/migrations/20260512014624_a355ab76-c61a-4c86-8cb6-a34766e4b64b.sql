create table public.vl_versions (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  user_id  uuid not null references auth.users(id)  on delete cascade,
  content text not null,
  config jsonb not null,
  prompt text not null default '',
  direction text not null check (direction in ('organizar','explicar','mais_visual')),
  legal_metadata jsonb not null default '{}'::jsonb,
  validation jsonb,
  risk jsonb,
  created_at timestamptz not null default now()
);

create index vl_versions_piece_idx on public.vl_versions (piece_id, created_at desc);

alter table public.vl_versions enable row level security;

create policy "vl_versions_select_own" on public.vl_versions
  for select to authenticated using (auth.uid() = user_id);

create policy "vl_versions_insert_own" on public.vl_versions
  for insert to authenticated with check (auth.uid() = user_id);

create policy "vl_versions_delete_own" on public.vl_versions
  for delete to authenticated using (auth.uid() = user_id);