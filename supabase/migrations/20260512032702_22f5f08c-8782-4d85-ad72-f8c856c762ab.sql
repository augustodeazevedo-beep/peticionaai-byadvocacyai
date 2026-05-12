-- Public-safe views for shared pieces (security_invoker so RLS still applies on base table)
create or replace view public.pieces_public
with (security_invoker = true) as
select id, title, content_text, content_html, public_slug, updated_at
from public.pieces
where is_shared = true and public_slug is not null;

grant select on public.pieces_public to anon, authenticated;

create or replace view public.vl_versions_public
with (security_invoker = true) as
select v.id, v.piece_id, v.content, v.direction, v.created_at
from public.vl_versions v
join public.pieces p on p.id = v.piece_id
where p.is_shared = true and p.public_slug is not null;

grant select on public.vl_versions_public to anon, authenticated;

-- Drop the broad public read policies on the base tables; keep owner-scoped policies intact.
drop policy if exists "pieces public read by slug" on public.pieces;
drop policy if exists "vl_versions public read by piece slug" on public.vl_versions;

-- Mark internal AI prompts/configuration as secret so non-admins can't read them.
update public.system_settings
set is_secret = true
where key in (
  'peticiona_persona',
  'peticiona_shadow_cabinet',
  'cognitive_os_config',
  'peticiona_rules_format',
  'peticiona_rules_citation',
  'peticiona_rules_antihalucinacao',
  'peticiona_structure',
  'peticiona_checklist_final'
);