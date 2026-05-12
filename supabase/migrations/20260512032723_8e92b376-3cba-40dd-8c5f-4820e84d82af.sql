-- Switch the public views to security definer so they can read shared rows
-- even though the base tables no longer expose anon read policies.
alter view public.pieces_public set (security_invoker = false);
alter view public.vl_versions_public set (security_invoker = false);