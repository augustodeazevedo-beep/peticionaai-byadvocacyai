-- Enum for library item types
do $$ begin
  create type public.library_item_type as enum (
    'prompt','documento','legislacao','jurisprudencia','modelo','podcast','diagrama','referencia_web'
  );
exception when duplicate_object then null; end $$;

-- Folders (hierarchical)
create table if not exists public.library_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  parent_id uuid references public.library_folders(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_library_folders_user on public.library_folders(user_id);
create index if not exists idx_library_folders_parent on public.library_folders(parent_id);

alter table public.library_folders enable row level security;
create policy "library_folders own all" on public.library_folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_library_folders_updated_at
  before update on public.library_folders
  for each row execute function public.set_updated_at();

-- Library items
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  folder_id uuid references public.library_folders(id) on delete set null,
  type public.library_item_type not null,
  title text not null,
  description text,
  content_text text,
  storage_path text,
  source_url text,
  mime_type text,
  size_bytes bigint,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  is_shared boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_library_items_user on public.library_items(user_id);
create index if not exists idx_library_items_folder on public.library_items(folder_id);
create index if not exists idx_library_items_type on public.library_items(type);
create index if not exists idx_library_items_tags on public.library_items using gin(tags);

alter table public.library_items enable row level security;
create policy "library_items own all" on public.library_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_library_items_updated_at
  before update on public.library_items
  for each row execute function public.set_updated_at();

-- Librarians (themed bundles)
create table if not exists public.librarians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  icon text not null default 'BookOpen',
  color text not null default 'cyan',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_librarians_user on public.librarians(user_id);

alter table public.librarians enable row level security;
create policy "librarians own all" on public.librarians for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_librarians_updated_at
  before update on public.librarians
  for each row execute function public.set_updated_at();

-- Junction
create table if not exists public.librarian_items (
  librarian_id uuid not null references public.librarians(id) on delete cascade,
  library_item_id uuid not null references public.library_items(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (librarian_id, library_item_id)
);
create index if not exists idx_librarian_items_user on public.librarian_items(user_id);
create index if not exists idx_librarian_items_item on public.librarian_items(library_item_id);

alter table public.librarian_items enable row level security;
create policy "librarian_items own all" on public.librarian_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for library files
insert into storage.buckets (id, name, public)
values ('library-files','library-files', false)
on conflict (id) do nothing;

create policy "library-files select own" on storage.objects for select
  using (bucket_id = 'library-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "library-files insert own" on storage.objects for insert
  with check (bucket_id = 'library-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "library-files update own" on storage.objects for update
  using (bucket_id = 'library-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "library-files delete own" on storage.objects for delete
  using (bucket_id = 'library-files' and auth.uid()::text = (storage.foldername(name))[1]);
