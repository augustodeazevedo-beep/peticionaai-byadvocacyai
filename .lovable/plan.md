# Plano: 4 Novas Features (1A–1D)

Implementação sequencial dos 4 prompts, todos em frontend + 1 migração leve para persistir preferências de IA.

---

## 1A — Skills Jurídicas (Comandos Rápidos) em `/pecas/nova`

**Novo componente:** `src/components/pieces/QuickCommandsPanel.tsx`
- Painel lateral (sticky à direita em `lg:`, accordion no mobile) com lista de 5 skills.
- Cada skill: `slug` (ex: `/contestacao-clt`), `label`, `description` (tooltip), `area`, `piece_type`, `prompt_hints`, `defaults` (campos a injetar no form).
- Campo de busca (`Input` + filtro client-side por slug/label/description).
- `Tooltip` do shadcn ao hover.

**Arquivo de dados:** `src/lib/quickCommands.ts`
- Array tipado com as 5 skills mapeando para `piece_type`/`area` existentes em `cognitiveOs.ts`.
- Para itens sem `piece_type` exato (cálculo, resumo de audiência, prazo), usar tipo genérico mais próximo (ex: `peticao_diversa`) + injetar `contexto` e `teses_principais`.

**Integração:** `src/routes/_authenticated.pecas.nova.tsx`
- Layout vira `grid lg:grid-cols-[1fr_280px]` com `QuickCommandsPanel` à direita.
- `onSelectCommand(cmd)` → `setForm(f => ({ ...f, area: cmd.area, piece_type: cmd.piece_type, title: f.title || cmd.label, contexto: cmd.promptSeed, ...cmd.defaults }))` + `toast.success("Comando aplicado")`.

---

## 1B — Segurança e Governança em `/configuracoes/ia`

**Migração:** adicionar colunas em `profiles` (ou nova tabela `ai_governance_prefs` por user_id) — `defensive_mode bool`, `human_in_loop bool`, `temporary_chats bool`, `ai_disclosure_enabled bool`, `ai_disclosure_text text`. Default ligado para defensive_mode e disclosure.

**UI:** seção "Segurança e Governança" em `_authenticated.configuracoes.ia.tsx` com 4 `Switch` + textarea editável para a frase de disclosure. Persistência via supabase.

**Hook global:** `src/lib/aiGovernance.ts` (`useAIGovernance()`) que carrega as prefs do user e expõe:
- `defensiveSystemPrompt` (string injetada em todas chamadas a `generatePieceCognitive`/visual-law quando ligado).
- `appendDisclosure(content)` helper aplicado em `pieceAssembler.ts` e `exportPdfProtocolo.tsx` antes do export.
- `requireHumanReview` flag consumido pelo `Pecas/$id` (modal antes de exportar/compartilhar).
- `skipPersistence` consumido em `_authenticated.workspace.tsx` e `pecas.nova.tsx` (não chama `supabase.from("pieces").insert`).

**Ícone de status:** em `AppHeader.tsx`, badge `Shield` (verde/vermelho) com tooltip quando defensive_mode on/off, link para `/configuracoes/ia`.

**Aviso:** "Modo Defensivo" e "Disclosure" são auxílios de governança — devem ser apresentados como mitigação, não garantia absoluta contra prompt injection.

---

## 1C — Otimizador de Tokens em `/workspace`

**Novo componente:** `src/components/workspace/UsagePanel.tsx`
- **Contador circular** de tokens (SVG, baseado em `(messages.length * avgTokens)` estimado via `lib/tokenEstimate.ts` simples — `text.length / 4`). Limite default 128k configurável.
- **Botão "Novo Chat"** sempre visível; `useEffect` dispara `toast` quando `messages.length > 20` (uma vez por sessão via ref).
- **Botão "Converter PDF→Markdown"**: input file aceitando `.pdf`, usa `pdfjs-dist` (já não instalado? — adicionar) ou fallback `unpdf` (Worker-friendly, ESM). Extrai texto, formata como markdown e insere no `ContextComposer` em vez do PDF original.
- **MCPs ativos**: lista mock dos integrações ativas (`user_integrations` table) com toggle. Reusa `useIntegrationsStore` se existir; caso contrário, leitura simples + update no Supabase.

**Integração:** `_authenticated.workspace.tsx` ganha coluna lateral `lg:grid-cols-[1fr_300px]` ou panel colapsável no topo.

**Lib:** `src/lib/tokenEstimate.ts` exporta `estimateTokens(text)` e `TOKEN_LIMIT`.

---

## 1D — Dashboard com KPIs em `/dashboard`

**Novo componente:** `src/components/dashboard/KpiCards.tsx` + `ProductionChart.tsx`
- Queries Supabase (executadas em paralelo via `useQueries`):
  - **Hoje vs ontem:** `count(*) from pieces where user_id=? and created_at >= today` e `between yesterday and today`. Calcula delta e seta `↑`/`↓` com cor.
  - **Tempo médio:** `avg(updated_at - created_at)` em segundos para peças com `status='ready'` nos últimos 30d.
  - **Top 3 templates:** `group by template_id, count(*) order by desc limit 3` (join com `piece_templates.name`).
  - **Peças compartilhadas:** `count from p_slug ... where is_public=true` (verificar tabela existente — provavelmente `pieces.share_slug is not null`; checar schema antes da query final).
  - **Histórico em lote:** últimas 5 de uma tabela `batch_runs` se existir, senão usar `integration_logs` filtrado por `kind='batch'`. Se nada disponível, mostrar estado vazio + nota.

- **Gráfico de linha (7 dias):** usar `recharts` (verificar se já instalado nos charts shadcn — sim, `src/components/ui/chart.tsx`). `LineChart` com `date_trunc('day', created_at)`. Cores: `hsl(var(--accent))` (cyan) e fundo `hsl(var(--primary))` (azul escuro) para alinhar com o gradiente da marca.

**Integração:** `_authenticated.dashboard.tsx` insere grid de KPIs acima da lista de peças (mantém hero atual).

---

## Sequência de execução

1. Confirmar schema (`pieces.share_slug`? tabela `batch_runs`?) — uma query rápida ao começar build.
2. Migração de `ai_governance_prefs`.
3. 1B (base de governança + hook global) — necessária para os outros consumirem `appendDisclosure`/`skipPersistence`.
4. 1A (Quick Commands) — isolado, frontend puro.
5. 1C (Usage Panel + PDF→MD) — instalar `unpdf`.
6. 1D (KPIs + chart) — frontend + queries.

## Pontos a confirmar

- **Limite de tokens default** para o medidor circular: 128k? configurável por usuário?
- **PDF→MD:** ok adicionar dependência `unpdf` (~150kb, Worker-friendly)? Alternativa é uma server function que faz parsing — mais robusto mas mais lento.
- **Disclosure no PDF:** rodapé em todas as páginas ou só na última?
- **Cores do gráfico:** manter gradiente cyan→violeta da marca (atual) ou trocar para "verde + azul escuro" como descrito no prompt 1D (que diverge da identidade atual)?
