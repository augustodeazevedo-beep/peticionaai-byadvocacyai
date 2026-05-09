
-- Enums
do $$ begin
  create type public.visual_law_direction as enum ('organizar','explicar','mais_visual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.visual_law_density as enum ('enxuto','padrao','confortavel');
exception when duplicate_object then null; end $$;

-- piece_visual_styles
create table if not exists public.piece_visual_styles (
  piece_id uuid primary key,
  user_id uuid not null,
  template text not null default 'sem-template',
  font text not null default 'Helvetica',
  color_palette text not null default 'neutra',
  custom_primary text,
  custom_accent text,
  direction public.visual_law_direction not null default 'explicar',
  density public.visual_law_density not null default 'padrao',
  extra_instructions text,
  elements jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.piece_visual_styles enable row level security;

drop policy if exists "piece_visual_styles own all" on public.piece_visual_styles;
create policy "piece_visual_styles own all"
on public.piece_visual_styles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists piece_visual_styles_set_updated_at on public.piece_visual_styles;
create trigger piece_visual_styles_set_updated_at
before update on public.piece_visual_styles
for each row execute function public.set_updated_at();

-- piece_visual_versions
create table if not exists public.piece_visual_versions (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null,
  user_id uuid not null,
  style_snapshot jsonb not null default '{}'::jsonb,
  pdf_storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists piece_visual_versions_piece_idx on public.piece_visual_versions (piece_id, created_at desc);

alter table public.piece_visual_versions enable row level security;

drop policy if exists "piece_visual_versions own all" on public.piece_visual_versions;
create policy "piece_visual_versions own all"
on public.piece_visual_versions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
