## Etapa 8 — Histórico de exports & compartilhamento público de versão

Itens remanescentes do plano inicial (msg #139) e da Etapa 6 marcados como "futuro":

- **Histórico de exports**: bucket `piece-exports` já recebe os arquivos PDF/DOCX gerados na Etapa 6, mas não há UI para listar/baixar exports anteriores.
- **Compartilhamento público de versão VL**: a tabela `pieces` já tem `is_shared` + `public_slug` e a rota `/p/$slug` já existe para a peça textual. Falta expor uma versão Visual Law específica como link público read-only.

### Arquivos novos

1. `src/services/visual-law/exportsHistory.ts`
   - `listExports(userId, pieceId): Promise<ExportEntry[]>` usando `supabase.storage.from("piece-exports").list("visual-law-ai/{userId}/{pieceId}")`.
   - `getExportSignedUrl(path): Promise<string>` (TTL 1h).
   - `deleteExport(path): Promise<void>`.

2. `src/components/visual-law/export/ExportHistoryDialog.tsx`
   - Dialog Radix com tabela: nome do arquivo, formato (badge PDF/DOCX), tamanho, data, ações (download / excluir).
   - Estado vazio amigável; loader durante fetch.

3. `src/components/visual-law/share/ShareVersionDialog.tsx`
   - Dialog com switch "Tornar versão pública" → ativa `is_shared = true` + gera `public_slug` se ausente.
   - Mostra URL `https://<host>/p/{slug}?vl={versionId}` com botão copiar.
   - Texto explicativo sobre risco de exposição de dados.

4. `src/routes/p.$slug.tsx` (edição)
   - Ler query param `?vl=<versionId>`; se presente e a versão pertence à peça pública, renderizar `<DocumentViewer />` em modo read-only com o `content` daquela `vl_versions` row.

### Edits

- `src/components/visual-law/VisualLawAIPanel.tsx`
  - Adicionar dois botões no header ao lado do `ExportButton`: `History` (ícone `History`) e `Share2` (ícone `Share2`).

- `src/components/visual-law/viewer/DocumentViewer.tsx`
  - Aceitar prop opcional `readOnlyContent?: string` para renderizar em modo público sem depender da store.

### Migrations

- Nova policy `vl_versions public read by piece slug`:
  ```sql
  create policy "vl_versions public read by piece slug"
  on public.vl_versions for select to anon, authenticated
  using (exists (
    select 1 from public.pieces p
    where p.id = vl_versions.piece_id
      and p.is_shared = true
      and p.public_slug is not null
  ));
  ```
- Garantir que o bucket `piece-exports` permita SELECT apenas pelo dono (já existe), e DELETE pelo dono (criar se faltar).

### UX

- Histórico: ordenado por data desc, paginação simples (limit 50). Toast confirmando exclusão.
- Compartilhamento: warning quando análise contém dados sensíveis (placeholders, citações pessoais).
- Em rota pública, ocultar sidebar de configuração e exibir apenas o documento.

### Smoke test

1. Build passa.
2. Gerar versão → exportar PDF → abrir histórico → arquivo aparece na lista, download funciona.
3. Excluir item do histórico remove do bucket.
4. Compartilhar versão → URL pública abre em aba anônima sem login e mostra o conteúdo.
5. Desativar compartilhamento na peça volta a 404 na rota pública.

### Fora do escopo

- Métricas de visualização do link público (futuro).
- Senha/expiração no link público (futuro).
- Comentários públicos.

### Riscos / mitigação

- **Vazamento via slug**: a policy só libera versões cuja peça-mãe está com `is_shared=true`; basta o usuário desativar para revogar.
- **Bucket lista grande**: paginar via `limit/offset` no `storage.list`.
- **Conflito de slugs**: reutilizar slug existente da `pieces` (já único).
