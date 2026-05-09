
# Plano — Funcionalidades inspiradas em MinutaIA / Portal-IA

Execução em duas ondas. Onda 1 entrega navegação/UX (sidebar + onboarding + busca + páginas stub funcionais). Onda 2 entrega o diferencial Visual Law (UI + PDF). Integrações CNJ/DJEN ficam embutidas como server functions usadas pelas novas páginas.

---

## Onda 1 — Navegação, busca e onboarding

### 1.1 AppSidebar (novo componente)
- Substitui o header atual em layout `_authenticated` por **SidebarProvider + AppSidebar + main com Outlet**. O header fica fino (só com `SidebarTrigger` + avatar/menu).
- Estrutura do sidebar (collapsible="icon"):
  - **Botão grande "+ Nova minuta"** → `navigate('/workspace')` resetando workspace ativo.
  - **Atalhos** (ícones + label): Compartilhamentos, Metadados CNJ, Comunicações DJEN, Histórico de Lote.
  - **Busca no histórico**: `<Input>` com ícone `Search`. Filtra `workspaces` + `pieces` por título via debounce (250ms) usando server fn `searchHistory`.
  - **Grupo "Projetos"**: lista `projects` do usuário + botão `+` que abre dialog para criar projeto.
  - **Grupo "Histórico"**: lista os 30 workspaces mais recentes (título + data relativa). Empty state: "Suas conversas aparecerão aqui".
  - Footer: link Biblioteca, Bibliotecários, Configurações de IA, Sair.
- Rota raiz `_authenticated.tsx` ganha o `SidebarProvider` envolvendo `<Outlet />`. Header público (`AppHeader`) fica só nas rotas não autenticadas.

### 1.2 Páginas novas (stubs funcionais, não "Em breve")
- `_authenticated.compartilhamentos.tsx`: lista peças com `is_shared=true` (vamos adicionar coluna). UI com toggle de compartilhamento por peça e link público read-only `/p/:slug` (rota nova `pecas.publicas.$slug.tsx`).
- `_authenticated.cnj.tsx` (Metadados CNJ): formulário com campo "Número CNJ" → chama server fn `lookupCnjMetadata` (DataJud público). Mostra: tribunal, classe, assuntos, partes, movimentações (últimas 20). Botão "Importar para projeto" cria/atualiza `projects` com metadata salvo em `metadata jsonb`.
- `_authenticated.djen.tsx` (Comunicações DJEN): formulário com OAB ou nome → server fn `searchDjenCommunications` consultando API pública DJEN (`https://comunicaapi.pje.jus.br/api/v1/comunicacao`). Lista comunicações com filtros por data e tribunal. Cada item tem botão "Criar minuta a partir desta intimação" → abre `/workspace` pré-preenchido.
- `_authenticated.historico-lote.tsx`: tabela paginada de todas as peças e workspaces com filtros (status, tipo, projeto, data). Ações em massa: arquivar, excluir, exportar.

### 1.3 Onboarding de contexto vazio (workspace)
- Dentro de `src/components/workspace/TabPanels.tsx` quando `contextItems.length === 0`:
  - Card centralizado "Contexto vazio" com instruções numeradas:
    1. "Adicione contexto usando as abas superiores" + grid de chips clicáveis (Documentos, Modelos, Jurisprudência, Legislação, Web) — cada chip troca a aba ativa.
    2. "Digite suas instruções no campo abaixo".
  - Aviso destacado: "Ao gerar peças, a IA pesquisa jurisprudência automaticamente no banco interno…".
  - Botão "Não mostrar novamente" salva flag em `localStorage` (`peticiona.workspace.onboardingDismissed`).

### 1.4 Migration (Onda 1)
- `pieces`: adicionar `is_shared boolean default false`, `public_slug text unique`.
- `projects`: adicionar `cnj_number text`, `metadata jsonb default '{}'`.
- `workspace_context_items`: nada (já temos).
- Server fns: `searchHistory`, `lookupCnjMetadata`, `searchDjenCommunications`, `togglePieceShare` em `src/lib/discovery.functions.ts` e `src/lib/sharing.functions.ts`.

---

## Onda 2 — Visual Law (UI completa + PDF estilizado real)

### 2.1 Modelo de dados
- Migration nova:
  - Enum `visual_law_direction`: `organizar | explicar | mais_visual`.
  - Enum `visual_law_density`: `enxuto | padrao | confortavel`.
  - Tabela `piece_visual_styles`:
    - `piece_id uuid` (PK + FK lógica), `user_id`, `template text` (default 'sem-template'), `font text` (default 'Helvetica'), `color_palette text` (default 'neutra'), `custom_primary text`, `custom_accent text`, `direction visual_law_direction default 'explicar'`, `density visual_law_density default 'padrao'`, `extra_instructions text`, `elements jsonb default '{}'` (toggles: capa, sumário, quadros, infográficos), `updated_at`.
  - Tabela `piece_visual_versions`: snapshots — `id`, `piece_id`, `user_id`, `style_snapshot jsonb`, `pdf_storage_path text`, `created_at`. Permite a aba "Versões".
  - RLS: own all em ambas.

### 2.2 Painel `VisualLawPanel`
Inserido em `_authenticated.pecas.$id.tsx` como aba ao lado do conteúdo. Estrutura igual à referência:

- Cabeçalho: "Antes de gerar — Configurações carregadas" + título "Revise o formato antes de transformar a peça".
- 4 cards quick-pick (Template, Fonte, Direção, Texto) que abrem o painel direito correspondente.
- Sidebar direito com tabs **Aparência | Direção | Elementos | Versões**:
  - **Aparência**: seleção de Fonte (Helvetica, Segoe UI, Charter, Inter, Playfair, Lora) + paleta (Neutra, Personalizada com 2 color pickers) + densidade (Enxuto/Padrão/Confortável).
  - **Direção**: 3 cards — Só organizar / Explicar melhor / Mais visual. Botão "Regerar com IA" chama `regenerateWithStyle`.
  - **Elementos**: switches — Capa, Sumário, Quadros destaque, Linha do tempo, Infográficos, Citações em quote-cards, Numeração de páginas.
  - **Versões**: lista `piece_visual_versions` com botão "Restaurar" e "Baixar PDF".
- Campo "Instruções visuais" (textarea opcional).
- Botão CTA gradient "Gerar Visual Law" → server fn `generateVisualLawPdf`.

### 2.3 Geração real de PDF
Server fn `generateVisualLawPdf` em `src/lib/visual-law.functions.ts`:
- Input: `{ pieceId }`. Lê peça + style + content_html.
- Gera HTML completo com CSS gerado dinamicamente a partir do estilo (variáveis CSS para fonte, paletas, densidade; classes para capa, quote-cards, timeline, etc.).
- Renderiza para PDF usando **`@react-pdf/renderer`** server-side (compatível com Worker runtime — pure JS, sem puppeteer/sharp). Templates React em `src/lib/visual-law/templates/`:
  - `MinimalTemplate`, `EditorialTemplate`, `CorporateTemplate` — todos consomem o objeto de estilo.
- Faz upload do PDF em `piece-exports/visual-law/{userId}/{pieceId}/{versionId}.pdf` e insere registro em `piece_visual_versions`.
- Retorna signed URL (download) e ID da versão.

> Nota técnica: `@react-pdf/renderer` funciona em Workers (já é usado em projetos TanStack Start). Caso precisemos de fontes além das embutidas, registramos via `Font.register` apontando para arquivos em `public/fonts/`.

### 2.4 Geração textual via Mike (sem custo extra para nós)
- A "Direção" envia o `content_text` da peça + instruções para `mike-generate` com prompt do tipo "reorganize o texto adicionando títulos, quadros [QUADRO]…[/QUADRO], timeline [TIMELINE]…, citações [QUOTE]…". O parser do template converte essas marcações em componentes visuais no PDF.
- Mantém política `mike_only` (BYOK do usuário).

---

## Integrações externas (detalhe técnico)

### CNJ DataJud
- Endpoint público: `POST https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search`
- Server fn detecta o tribunal pelo segmento do número CNJ e faz fallback varrendo principais (tjsp, tjrj, trf3, tst, etc.).
- Sem autenticação. Cache de 30 min em `system_settings` por número.

### DJEN
- Endpoint público: `GET https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=...&ufOab=...&dataDisponibilizacaoInicio=...`
- Server fn aceita filtros e devolve resultados paginados (até 100/página).
- Sem chave. Logamos em `integration_logs`.

---

## Critérios de aceite

**Onda 1**
- Sidebar com Nova minuta, atalhos, busca funcional (filtra ao digitar), Projetos e Histórico povoados.
- `/cnj` resolve um número CNJ válido em ≤3s e mostra metadados.
- `/djen` lista comunicações reais por OAB.
- Workspace vazio mostra o card de onboarding com chips clicáveis e dismiss persistente.
- `/historico-lote` lista todas as peças com filtros e ações em massa.

**Onda 2**
- Painel Visual Law renderiza idêntico em layout à referência (4 cards + sidebar de tabs).
- Mudar fonte/cor/densidade atualiza preview instantaneamente.
- "Gerar Visual Law" produz PDF baixável estilizado conforme escolhas, salvo em storage e listado em "Versões".
- Snapshots permitem restaurar uma versão anterior.
- Tudo passa por Mike para reorganização textual; Lovable AI não é usado para geração.

---

## Ordem de execução

1. **Migration onda 1** (is_shared, public_slug, cnj_number) → aprovação.
2. AppSidebar + reorganização do `_authenticated.tsx` + onboarding workspace.
3. Server fns + páginas (CNJ, DJEN, Compartilhamentos, Histórico de Lote).
4. **Migration onda 2** (visual_law tabelas/enums) → aprovação.
5. Templates `@react-pdf/renderer` + server fn `generateVisualLawPdf`.
6. `VisualLawPanel` integrado à página da peça + tab Versões.

Posso começar pela migration da Onda 1 assim que aprovado.
