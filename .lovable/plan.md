## Diagnóstico

Rodei uma auditoria contra o banco. A causa raiz do erro `permission denied for function has_role` não é o corpo da função — ela já está `SECURITY DEFINER` com `search_path = public`. O problema é que **nem a função `has_role` nem as tabelas `user_roles`, `system_settings`, `integration_logs`, `useful_links` têm qualquer `GRANT`** para `authenticated`/`anon`. Sem isso o PostgREST rejeita a chamada antes mesmo de avaliar a RLS.

Além disso, várias políticas estão duplicadas/soltas com `FOR ALL TO public` — misturam SELECT com escrita e conflitam com políticas mais específicas.

### Achados exatos

- `has_role(uuid, app_role)`: `SECURITY DEFINER` ok, mas 0 grants.
- Tabelas afetadas: 0 grants em `information_schema.role_table_grants`.
- Políticas com `FOR ALL TO public` em todas as 4 tabelas (deveria ser `TO authenticated`).
- `user_roles` tem SELECT `TO public` — mesma questão de role.

## Plano de correção (uma migração)

### Fase 1 — Permissões

1. `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;`
2. Tabelas — grants alinhados às políticas:
   - `user_roles`: `GRANT SELECT ON ... TO authenticated;` + `GRANT ALL ... TO service_role;`
   - `system_settings`: `GRANT SELECT ON ... TO authenticated;` + `GRANT ALL ... TO service_role;`
   - `integration_logs`: `GRANT SELECT ON ... TO authenticated;` + `GRANT ALL ... TO service_role;`
   - `useful_links`: `GRANT SELECT ON ... TO authenticated;` + `GRANT INSERT, UPDATE, DELETE ON ... TO authenticated;` (escrita é filtrada por `has_role`) + `GRANT ALL ... TO service_role;`

### Fase 2 — RLS limpa e específica

Substituir as policies "* admin all" `FOR ALL TO public` por conjuntos separados `TO authenticated`, mantendo comportamento atual:

- **`user_roles`**
  - SELECT: usuário vê apenas as próprias linhas (`auth.uid() = user_id`) + admin vê todas.
  - INSERT/UPDATE/DELETE: só admin (mantém as RESTRICTIVE de escalonamento existentes).
- **`system_settings`**
  - SELECT: autenticado, apenas onde `is_secret = false`; admin vê tudo.
  - INSERT/UPDATE/DELETE: só admin.
- **`integration_logs`**
  - SELECT: dono (`auth.uid() = user_id`) + admin.
  - INSERT/UPDATE/DELETE: só admin (escrita real vem via `service_role`, que ignora RLS).
- **`useful_links`**
  - SELECT: autenticado + `is_active = true`; admin vê todos.
  - INSERT/UPDATE/DELETE: só admin.

Todas as novas policies `TO authenticated` (não `public`), eliminando ambiguidade de role.

### Fase 3 — Backend-only (já ok, sem mudança de código)

- `has_role` continua `SECURITY DEFINER` com `search_path=public` (já está).
- `checkIsAdmin` em `admin.functions.ts` continua rodando no servidor via `requireSupabaseAuth` — nenhuma checagem de admin no cliente.
- `service_role_key` já é server-only. Nenhuma chave privada no bundle.

### Fase 4 — Cabeçalhos anti-embed (Cloudflare Worker)

Adicionar em `src/server.ts` (wrapper de resposta) headers em toda resposta HTML:
- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: interest-cohort=()`

E um comentário de copyright injetado no HTML SSR (`© Advocacy.AI — Todos os direitos reservados. Cópia não autorizada proibida.`).

> Ofuscação de JS extra não é aplicada: o build já é minificado pelo Vite, e ofuscadores agressivos quebram TanStack Start (source maps, code-splitting de server functions). Não recomendo.

### O que NÃO farei sem sua confirmação

- Não vou mexer nas policies RESTRICTIVE de escalonamento de admin já existentes (elas estão corretas).
- Não vou dropar a função `has_role` — apenas ajustar grants.
- Não vou adicionar ofuscador de JS.

## Entregáveis

1. **1 migração SQL** com: GRANT na função, GRANTs nas 4 tabelas, DROP das policies antigas `FOR ALL TO public`, CREATE das novas policies segmentadas por comando.
2. **1 edição** em `src/server.ts` adicionando os headers de segurança e o comentário de copyright.

Confirma que posso seguir?
