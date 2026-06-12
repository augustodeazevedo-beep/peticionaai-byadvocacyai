
# Integração Jurisprudências.AI

Integra a API oficial `https://jurisprudencias.ai/api/v1` (busca + lookup), com a chave armazenada de forma segura no backend, UI dedicada de pesquisa + jurimetria, histórico de buscas e injeção de ementas literais como contexto obrigatório no pipeline cognitivo de geração de peças.

## 1. Backend — proxy seguro da API

A chave `jur_...` é privada e fica no servidor (jamais em `VITE_*`).

- Secret `JURISPRUDENCIAS_AI_API_KEY` (via `add_secret`).
- `src/lib/jurisprudencia.server.ts` — `fetch` à API com `Authorization: Bearer ${process.env.JURISPRUDENCIAS_AI_API_KEY}`.
- `src/lib/jurisprudencia.functions.ts` — server fns com `requireSupabaseAuth`:
  - `searchJurisprudencia({ query, court?, page?, per_page? })`
  - `lookupDecision({ process_number })`
  - `getJurisprudenciaKeyStatus()` → `{ hasKey: boolean }`
- `src/services/jurisprudenciaService.ts` — só **types** (`Decision`, `SearchParams`, `SearchResponse`) + thin wrappers via `useServerFn`. **Não** chama a API direto do browser.

## 2. Banco de dados

Duas tabelas (RLS por `auth.uid()`, `GRANT` para `authenticated`/`service_role`, trigger `set_updated_at`):

- `public.jurisprudencia_buscas` — **histórico de buscas** (a pedido).
  - `user_id`, `query`, `court`, `page`, `per_page`, `total_results`, `executed_at`.
- `public.jurisprudencia_selecoes` — decisões marcadas para usar em peças.
  - `user_id`, `piece_id?`, `decision_id`, `process_number`, `court`, `judging_body`, `rapporteur`, `judgment_date`, `publication_date`, `syllabus`, `url`.

Server fns auxiliares: `listBuscasRecentes(limit)`, `clearHistorico()`, `saveSelecao(...)`, `listSelecoes(pieceId?)`, `removeSelecao(id)`.

## 3. UI — Pesquisa & Jurimetria

Nova rota `src/routes/_authenticated.jurisprudencia.tsx` + item "Jurisprudência" na `AppSidebar`.

Filtro de tribunais (conforme definido):
`Todos · STF · STJ · TST · TJRS · TJSP · TJRJ · TRF1 · TRF2 · TRF3 · TRF4 · TRF5 · TRF6` — constante exportada em `src/lib/jurisprudenciaTribunais.ts`.

Componentes (Tailwind + shadcn, alinhados ao design system: `bg-gradient-brand`, `rounded-2xl border-border/60 bg-card/60 backdrop-blur`):

- `JurisprudenciaSearchBar` — input com placeholder explicando `AND`/`OR`/aspas, select de tribunal, paginação.
- `DecisionCard` — tribunal, nº processo, órgão julgador, relator, datas; ementa colapsável com **"Ver mais"** (`aria-expanded`), botões "Copiar ementa", "Adicionar ao contexto da peça", link externo.
- `JurimetriaPanel` — **agregações apenas sobre a página atual** (conforme definido): distribuição por tribunal, por relator, por ano. Gráficos com `recharts` via `chart.tsx`.
- `HistoricoBuscas` — lista lateral/colapsável das últimas 20 buscas com clique para refazer; ação "Limpar histórico".
- `LookupProcessoDialog` — busca por nº CNJ (`lookupDecision`).

Estado: TanStack Query (`useQuery`) sobre as server fns; gravação no histórico acontece dentro de `searchJurisprudencia` (server-side) após resposta OK.

## 4. Configurações

Em `src/routes/_authenticated.configuracoes.ia.tsx`, novo card "Jurisprudências.AI":
- Mostra status `hasKey` (sem expor valor).
- Botão "Configurar/Atualizar chave" → fluxo Lovable de secret.
- Texto explicando que a chave é única do servidor (multi-tenant não exigido).

## 5. Integração com gerador de peças (antialucinação)

- Store leve `src/stores/jurisprudenciaContexto.ts` (Zustand) — itens selecionados para a próxima geração.
- `PieceFormSections` ganha bloco "Jurisprudência selecionada" listando itens + remover + botão "Buscar jurisprudência" (abre `JurisprudenciaPickerDialog` reaproveitando a UI da rota).
- Em `_authenticated.pecas.nova.tsx` (`onGenerate`), prepend ao `context`:

  ```
  [JURISPRUDÊNCIAS SELECIONADAS — CITAR LITERALMENTE COM ASPAS]
  1) {court} — Proc. {process_number} — {judging_body} — Rel. {rapporteur} — j. {judgment_date}
     EMENTA: "{syllabus}"
  ...
  REGRA ANTIALUCINAÇÃO: é proibido parafrasear, resumir ou inventar
  jurisprudência. Use somente as ementas acima quando citar precedentes,
  reproduzindo o texto entre aspas e referenciando tribunal, número do
  processo, órgão julgador e data conforme fornecido. Se faltar suporte,
  declare "sem precedente fornecido" em vez de inventar.
  ```

- Mesma regra adicionada ao `DEFENSIVE_SYSTEM_PROMPT` (`src/lib/aiGovernance.ts`) e ao prompt-base em `supabase/functions/mike-generate/prompts.ts` para reforço server-side.
- Após criar a peça, persistir as seleções em `jurisprudencia_selecoes` com `piece_id` (auditoria/rastreabilidade).

## 6. Detalhes técnicos

- Server fns só consumidas em componentes/`_authenticated` (nunca em loader de rota pública).
- Tratamento de 401/403/429 → toast amigável; retry exponencial leve em 5xx.
- Cache: `staleTime: 5 min` em buscas; `queryKey` inclui `query`, `court`, `page`.
- A11y: card colapsável com `aria-expanded`; foco preservado ao expandir.

## Arquivos a criar/editar

```text
add  src/lib/jurisprudencia.server.ts
add  src/lib/jurisprudencia.functions.ts
add  src/lib/jurisprudenciaTribunais.ts
add  src/services/jurisprudenciaService.ts
add  src/stores/jurisprudenciaContexto.ts
add  src/components/jurisprudencia/DecisionCard.tsx
add  src/components/jurisprudencia/JurisprudenciaSearchBar.tsx
add  src/components/jurisprudencia/JurimetriaPanel.tsx
add  src/components/jurisprudencia/HistoricoBuscas.tsx
add  src/components/jurisprudencia/JurisprudenciaPickerDialog.tsx
add  src/components/jurisprudencia/LookupProcessoDialog.tsx
add  src/routes/_authenticated.jurisprudencia.tsx
add  supabase/migrations/<ts>_jurisprudencia.sql   (buscas + selecoes)
edit src/components/AppSidebar.tsx                 (item "Jurisprudência")
edit src/components/pieces/PieceFormSections.tsx   (bloco seleção)
edit src/routes/_authenticated.pecas.nova.tsx     (montar contexto + persistir)
edit src/lib/aiGovernance.ts                       (regra antialucinação)
edit supabase/functions/mike-generate/prompts.ts   (reforço server-side)
edit src/routes/_authenticated.configuracoes.ia.tsx (status da chave)
secret JURISPRUDENCIAS_AI_API_KEY
```
