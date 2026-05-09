
# Plano consolidado — Fases restantes (execução fase-a-fase)

A Onda 1 (sidebar, CNJ, DJEN, compartilhamentos, histórico de lote, onboarding) já está implementada. Restam: **Onda 2 — Visual Law** e **Fase 4 — Bibliotecários/IA + polimento** (CNJ/DJEN como atalhos no workspace, integração das peças geradas, bibliotecários ativos no contexto, observabilidade Mike). Tudo será executado em uma única passagem ordenada para não criar regressões.

---

## Fase A — Migration Visual Law (aprovação obrigatória antes de código)

Criar em uma única migration:

- Enums:
  - `visual_law_direction` = `organizar | explicar | mais_visual`
  - `visual_law_density` = `enxuto | padrao | confortavel`
- Tabela `piece_visual_styles` (1-1 com `pieces`):
  - `piece_id uuid PK`, `user_id uuid not null`, `template text default 'sem-template'`, `font text default 'Helvetica'`, `color_palette text default 'neutra'`, `custom_primary text`, `custom_accent text`, `direction visual_law_direction default 'explicar'`, `density visual_law_density default 'padrao'`, `extra_instructions text`, `elements jsonb default '{}'`, `updated_at timestamptz default now()`.
- Tabela `piece_visual_versions`:
  - `id`, `piece_id`, `user_id`, `style_snapshot jsonb`, `pdf_storage_path text`, `created_at`.
- RLS `own all` em ambas; trigger `set_updated_at` em `piece_visual_styles`.

## Fase B — Geração de PDF (Visual Law)

1. Adicionar dependência `@react-pdf/renderer` (Worker-safe, pure JS).
2. Criar templates em `src/lib/visual-law/templates/`: `MinimalTemplate`, `EditorialTemplate`, `CorporateTemplate` — todos consomem o objeto de estilo (fonte, paleta, densidade, elementos).
3. Parser de marcações (`[QUADRO]…[/QUADRO]`, `[TIMELINE]…`, `[QUOTE]…`) que converte texto em componentes visuais.
4. Server fn `generateVisualLawPdf({ pieceId })` em `src/lib/visual-law.functions.ts`:
   - Lê peça + style.
   - Renderiza PDF via `@react-pdf/renderer`.
   - Upload em `piece-exports/visual-law/{userId}/{pieceId}/{versionId}.pdf`.
   - Insere em `piece_visual_versions` e devolve signed URL.
5. Server fn `regenerateWithStyle({ pieceId })` que envia `content_text` + instruções da Direção para `mike-generate` (mantém policy `mike_only`) e atualiza `pieces.content_text/html`.

## Fase C — Painel `VisualLawPanel`

Integra na rota `_authenticated.pecas.$id.tsx`:

- Cabeçalho "Antes de gerar — Configurações carregadas" + 4 cards quick-pick (Template, Fonte, Direção, Texto).
- Sidebar direito com tabs **Aparência | Direção | Elementos | Versões**:
  - Aparência: Fonte (Helvetica, Segoe UI, Charter, Inter, Playfair, Lora) + Paleta (Neutra / Personalizada com 2 color pickers) + Densidade.
  - Direção: 3 cards (Só organizar / Explicar / Mais visual) + botão "Regerar com IA".
  - Elementos: switches (Capa, Sumário, Quadros, Timeline, Infográficos, Quote-cards, Numeração).
  - Versões: lista `piece_visual_versions` com Restaurar / Baixar PDF.
- Textarea "Instruções visuais".
- CTA gradient "Gerar Visual Law" → `generateVisualLawPdf`.
- Persistência de estilo em `piece_visual_styles` (debounced upsert).

## Fase D — Integração cruzada e polimento (Fase 4)

1. **Bibliotecários no workspace**: ao gerar via `mike-generate`, se workspace tem bibliotecário(s) ativo(s), incluir os `library_items` associados como contexto adicional (já existe `librarian_items`). Adicionar selector na sidebar do workspace.
2. **CNJ/DJEN como atalho dentro do workspace**: na aba "Documentos", botão "Importar do CNJ" e "Importar do DJEN" abre dialogs reutilizando as server fns existentes; resultado entra como `workspace_context_items` tipo `cnj`/`djen`.
3. **Histórico de Lote — ações reais**: ligar bulk-archive/bulk-delete às mutations (atualmente UI-only).
4. **Observabilidade Mike**: tela `/configuracoes/ia` ganha card com últimas 20 chamadas (`token_usage`) — gráfico simples de consumo diário.
5. **Compartilhamento público `/p/:slug`**: aplicar tema Visual Law se a peça tiver `piece_visual_styles` (renderiza HTML estilizado, não só texto cru).

## Critérios de aceite

- Migration aplicada sem warnings de linter.
- `generateVisualLawPdf` retorna URL baixável; PDF abre com fonte/paleta escolhidas.
- Restaurar versão recoloca `style_snapshot` no painel.
- Toda geração de texto continua passando por Mike (policy mantida).
- Workspace permite anexar bibliotecário, e contexto entra no prompt do Mike.
- Importar CNJ/DJEN cria `workspace_context_items` corretamente.
- Bulk actions em `/historico-lote` persistem no banco.
- `/configuracoes/ia` mostra consumo de tokens.
- Página pública de peça compartilhada respeita o estilo Visual Law.

## Ordem de execução (estrita)

1. Fase A (migration) → aprovação do usuário.
2. Instalar `@react-pdf/renderer` e implementar Fase B.
3. Implementar Fase C (painel) e validar fluxo end-to-end.
4. Implementar Fase D (integrações cruzadas + polimento).
5. Verificação final: build, navegação por todas as rotas novas, geração de PDF de teste.

## Notas técnicas

- `@react-pdf/renderer` é compatível com Workers (pure JS). Fontes extras via `Font.register` apontando para `public/fonts/`.
- Nenhuma chamada a Lovable AI Gateway para geração (apenas Mike). Lovable AI continua disponível só como fallback explícito futuro, não nesta fase.
- Tabelas Visual Law usam `piece_id` sem FK física (mesmo padrão das demais), mas com índice único.
