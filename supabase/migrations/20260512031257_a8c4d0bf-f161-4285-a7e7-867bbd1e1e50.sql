create table public.piece_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  area text not null,
  piece_type text not null,
  scope text not null default 'pessoal',
  content_md text not null default '',
  structure jsonb not null default '{}'::jsonb,
  style_overrides jsonb not null default '{}'::jsonb,
  prompt_hints text,
  tags text[] not null default '{}'::text[],
  is_default boolean not null default false,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index piece_templates_user_area_type_idx on public.piece_templates (user_id, area, piece_type);
create index piece_templates_user_default_idx on public.piece_templates (user_id, is_default);

alter table public.piece_templates enable row level security;

create policy "piece_templates own select" on public.piece_templates for select using (auth.uid() = user_id);
create policy "piece_templates own insert" on public.piece_templates for insert with check (auth.uid() = user_id);
create policy "piece_templates own update" on public.piece_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "piece_templates own delete" on public.piece_templates for delete using (auth.uid() = user_id);

create trigger piece_templates_set_updated_at
before update on public.piece_templates
for each row execute function public.set_updated_at();

alter table public.pieces add column if not exists template_id uuid;
create index if not exists pieces_template_id_idx on public.pieces (template_id);