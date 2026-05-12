## Etapa 4 — Persistência de versões Visual Law AI

Objetivo: Persistir as versões geradas pela nova plataforma Visual Law AI em uma tabela própria (`vl_versions`), sem interferir na tabela legada `piece_visual_versions` (que continua dedicada ao PDF atual). Carregamento automático ao abrir a peça e sincronização após cada `finishGeneration`.

### Migração (nova tabela isolada)

```sql
create table public.vl_versions (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  user_id  uuid not null references auth.users(id)  on delete cascade,
  content text not null,
  config jsonb not null,
  prompt text not null default '',
  direction text not null check (direction in ('organizar','explicar','mais_visual')),
  legal_metadata jsonb not null default '{}'::jsonb,
  validation jsonb,
  risk jsonb,
  created_at timestamptz not null default now()
);

create index vl_versions_piece_idx on public.vl_versions (piece_id, created_at desc);

alter table public.vl_versions enable row level security;

create policy "vl_versions_select_own" on public.vl_versions
  for select to authenticated using (auth.uid() = user_id);
create policy "vl_versions_insert_own" on public.vl_versions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "vl_versions_delete_own" on public.vl_versions
  for delete to authenticated using (auth.uid() = user_id);
```

Sem update (versões são imutáveis). Sem trigger de updated_at.

### Camada de dados (frontend)

`src/services/visual-law/versions.ts` (novo):

- `loadVersions(pieceId)` → `Promise<VLVersion[]>` lendo `vl_versions` ordenado por `created_at asc`, mapeando colunas → tipo `VLVersion` (id/timestamp/content/config/prompt/direction/legalMetadata/validation/risk).
- `persistVersion(pieceId, userId, version)` → insere e devolve a row criada (com id/timestamp do servidor).
- `deleteVersion(versionId)` → opcional para Etapa futura; não usar na UI ainda.

Cliente Supabase: `@/integrations/supabase/client` (RLS aplica `auth.uid() = user_id`).

### Store (ajustes mínimos)

`src/stores/visualLaw.ts`:

- Nova action `hydrateVersions(versions: VLVersion[])` → substitui `versions` e seleciona a última como `selectedVersionId` + `documentContent` (sem mexer em `documentConfig` se já configurado).
- `finishGeneration` permanece síncrono e in-memory; persistência fica no orquestrador (separation of concerns).

### Orquestrador

`src/services/visual-law/generate.ts`:

- Após `finishGeneration`, disparar `persistVersion` em background. Se falhar, `toast.error` mas mantém versão local (degrade gracioso).
- Substituir o `id`/`timestamp` da versão local pelos do servidor quando o insert retornar (via novo helper `replaceLastVersionMeta` no store) — evita divergência entre cliente e BD.

### Hook de hidratação

`src/hooks/visual-law/useLoadVersions.ts` (novo):

- `useEffect` em `VisualLawAIPanel` mount: chama `loadVersions(pieceId)` → `hydrateVersions(rows)`.
- Se rows.length === 0 → mantém `documentContent` vindo da peça (comportamento atual).
- Em erro de rede → `toast.error("Falha ao carregar versões salvas")` e segue com store vazio.

### Tipos

`src/types/visual-law.ts` já tem `VLVersion`. Adicionar utilitário interno `mapRowToVersion`/`mapVersionToRow` em `versions.ts` (não exportado nos tipos públicos).

### UI

- `VersionsTimeline` continua como está; passa a refletir versões persistidas automaticamente.
- `VersionCard` ganha um pequeno indicador visual (`Cloud` icon) quando `version.id` é UUID do servidor (heurística simples: foi salvo). Opcional — default mantém o card atual.
- Loading inicial: exibir skeleton minimalista no `VersionsTimeline` enquanto `loadVersions` está em flight (estado local no hook).

### Smoke test

1. `bun run build` passa.
2. Migração aplicada → tabela `vl_versions` existe com RLS.
3. Abrir peça nova → timeline vazia → gerar 2 versões → recarregar página → timeline mostra as 2 versões em ordem cronológica.
4. Trocar de usuário → não vê versões alheias (RLS).
5. `selectVersion`/`rollbackTo` funcionam normalmente sobre os dados hidratados.
6. Deletar peça → versões somem (cascade).

### Fora do escopo

- **Etapa 5**: análise de risco e validação jurídica (`VLLegalValidation`/`VLRiskAnalysis`) — colunas `validation`/`risk` já reservadas e ficam `null` por enquanto.
- **Etapa 6**: export/import de versões em PDF/DOCX da nova plataforma.
- Diff entre versões e merge — fora desta etapa.
- Sincronização realtime entre abas — fora.

### Riscos / mitigação

- **Conflito com tabela legada `piece_visual_versions`**: nome diferente (`vl_versions`) elimina ambiguidade.
- **Race condition** (insert ainda voando + nova geração): usamos `id` do servidor quando responder; fallback usa o uuid local que já é válido.
- **Falha de persistência**: versão fica disponível em memória até refresh; toast informa usuário.
