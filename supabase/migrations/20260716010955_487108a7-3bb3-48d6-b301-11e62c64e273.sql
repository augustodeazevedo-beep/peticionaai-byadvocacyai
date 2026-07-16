
create table public.detectai_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_preview text not null,
  score int not null,
  findings jsonb not null default '[]'::jsonb,
  model text,
  stages jsonb,
  content_hash text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.detectai_checks to authenticated;
grant all on public.detectai_checks to service_role;
alter table public.detectai_checks enable row level security;
create policy "detectai_checks_select_own" on public.detectai_checks for select to authenticated using (auth.uid() = user_id);
create policy "detectai_checks_insert_own" on public.detectai_checks for insert to authenticated with check (auth.uid() = user_id);
create policy "detectai_checks_delete_own" on public.detectai_checks for delete to authenticated using (auth.uid() = user_id);
create index detectai_checks_user_created_idx on public.detectai_checks (user_id, created_at desc);
