
-- Enums
create type public.app_role as enum ('admin', 'user');
create type public.piece_status as enum ('draft', 'generating', 'ready', 'exported', 'archived');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  oab text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles select own" on public.user_roles for select using (auth.uid() = user_id);
create policy "user_roles admin all" on public.user_roles for all using (public.has_role(auth.uid(),'admin'));

-- handle_new_user trigger: create profile + grant admin to allowlist
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  if lower(new.email) in ('augustodeazevedo@gmail.com','azevedo.advocacia@outlook.com') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- system_settings (admin-only writes, all authed read for non-secret keys)
create table public.system_settings (
  key text primary key,
  value text,
  description text,
  is_secret boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.system_settings enable row level security;
create policy "system_settings admin all" on public.system_settings for all using (public.has_role(auth.uid(),'admin'));
create policy "system_settings read non-secret" on public.system_settings for select using (auth.uid() is not null and is_secret = false);
create trigger system_settings_updated_at before update on public.system_settings
  for each row execute function public.set_updated_at();

-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  client_name text,
  area text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "projects own all" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

-- pieces
create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  piece_type text not null default 'peticao_inicial_civel',
  area text,
  status piece_status not null default 'draft',
  input_data jsonb not null default '{}'::jsonb,
  content_html text,
  content_text text,
  checklist jsonb,
  observations text,
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pieces enable row level security;
create policy "pieces own all" on public.pieces for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger pieces_updated_at before update on public.pieces for each row execute function public.set_updated_at();
create index pieces_user_idx on public.pieces(user_id, created_at desc);

-- piece_versions
create table public.piece_versions (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_html text,
  content_text text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.piece_versions enable row level security;
create policy "piece_versions own all" on public.piece_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- case_files (metadata; storage in bucket)
create table public.case_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  piece_id uuid references public.pieces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
alter table public.case_files enable row level security;
create policy "case_files own all" on public.case_files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- integration_logs (admin-only read)
create table public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  integration text not null,
  endpoint text,
  status_code int,
  ok boolean,
  request_summary text,
  response_summary text,
  error text,
  duration_ms int,
  created_at timestamptz not null default now()
);
alter table public.integration_logs enable row level security;
create policy "integration_logs admin all" on public.integration_logs for all using (public.has_role(auth.uid(),'admin'));

-- useful_links (catalogo público para autenticados)
create table public.useful_links (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  url text not null,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.useful_links enable row level security;
create policy "useful_links read auth" on public.useful_links for select using (auth.uid() is not null and is_active = true);
create policy "useful_links admin all" on public.useful_links for all using (public.has_role(auth.uid(),'admin'));

-- user_link_favorites
create table public.user_link_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  link_id uuid not null references public.useful_links(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, link_id)
);
alter table public.user_link_favorites enable row level security;
create policy "favorites own all" on public.user_link_favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage buckets (private)
insert into storage.buckets (id, name, public) values ('case-files','case-files', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('piece-exports','piece-exports', false) on conflict do nothing;

create policy "case-files own read" on storage.objects for select
  using (bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "case-files own write" on storage.objects for insert
  with check (bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "case-files own update" on storage.objects for update
  using (bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "case-files own delete" on storage.objects for delete
  using (bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "piece-exports own read" on storage.objects for select
  using (bucket_id = 'piece-exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "piece-exports own write" on storage.objects for insert
  with check (bucket_id = 'piece-exports' and auth.uid()::text = (storage.foldername(name))[1]);
