-- Enums
do $$ begin
  create type public.workspace_mode as enum ('padrao','agentico');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.thinking_level as enum ('baixo','medio','alto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.context_item_type as enum ('documento','modelo','legislacao','jurisprudencia','web','biblioteca_item','bibliotecario','prompt','transcricao','url','texto');
exception when duplicate_object then null; end $$;

-- workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references public.projects(id) on delete set null,
  piece_id uuid references public.pieces(id) on delete set null,
  title text not null default 'Nova minuta',
  instructions text not null default '',
  mode public.workspace_mode not null default 'padrao',
  thinking public.thinking_level not null default 'medio',
  agent_config jsonb not null default '{
    "ask_questions": false,
    "approve_outline": false,
    "traceable_references": true,
    "use_jurisprudence": true,
    "use_legislation": true,
    "use_models": false,
    "use_calculator": false,
    "verbosity": "longo"
  }'::jsonb,
  template_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create policy "workspaces own all" on public.workspaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_workspaces_user on public.workspaces(user_id, updated_at desc);

create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- workspace_context_items
create table if not exists public.workspace_context_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  type public.context_item_type not null,
  title text not null,
  preview text,
  source_url text,
  storage_path text,
  payload jsonb not null default '{}'::jsonb,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.workspace_context_items enable row level security;

create policy "workspace_context_items own all" on public.workspace_context_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_wci_workspace on public.workspace_context_items(workspace_id, display_order);
