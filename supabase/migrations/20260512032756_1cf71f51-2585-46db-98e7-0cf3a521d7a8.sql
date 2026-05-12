-- Make views security_invoker (caller's permissions). Anon will then need
-- column-level grants + a narrow RLS policy on the base tables to read
-- only the safe columns of shared rows.
alter view public.pieces_public set (security_invoker = true);
alter view public.vl_versions_public set (security_invoker = true);

-- Re-add narrow public-read RLS policies on base tables for shared rows.
-- Column scope is enforced via column-level grants below.
drop policy if exists "pieces public read shared safe" on public.pieces;
create policy "pieces public read shared safe"
on public.pieces for select
to anon, authenticated
using (is_shared = true and public_slug is not null);

drop policy if exists "vl_versions public read shared safe" on public.vl_versions;
create policy "vl_versions public read shared safe"
on public.vl_versions for select
to anon, authenticated
using (
  exists (
    select 1 from public.pieces p
    where p.id = vl_versions.piece_id
      and p.is_shared = true
      and p.public_slug is not null
  )
);

-- Revoke broad anon SELECT and re-grant only safe columns. authenticated
-- keeps full SELECT (RLS still scopes to owner via existing 'pieces own all').
revoke select on public.pieces from anon;
grant select (id, title, content_text, content_html, public_slug, updated_at, is_shared)
  on public.pieces to anon;

revoke select on public.vl_versions from anon;
grant select (id, piece_id, content, direction, created_at)
  on public.vl_versions to anon;