## Objetivo

Elevar a qualidade da criação de petições aplicando o JSON do "Sistema Operacional Jurídico Cognitivo" como motor real, com pipeline de raciocínio em múltiplas etapas, persona/tribunal adaptativos, controle antialucinação e auditoria interna — preservando o fluxo atual (`/pecas/nova` + `mike-generate`).

---

## 1. Configuração — `system_settings`

Nova chave única `cognitive_os_config` (JSON, não-secret) contendo o JSON enviado pelo usuário, editável em `/admin/integracoes` (já existe a tela; adicionar editor JSON com validação Zod no client antes de salvar).

Migração: nenhuma estrutural — apenas `INSERT ... ON CONFLICT DO UPDATE` do default seed via migration.

Mantém retrocompatibilidade: se a chave estiver ausente, o pipeline cai no comportamento atual (chaves `peticiona_*`).

---

## 2. Pipeline multi-etapas (edge function `mike-generate`)

Refatorar para orquestrar 4 chamadas LLM sequenciais. Cada etapa retorna JSON estruturado (via tool calling) e alimenta a próxima.

```text
INPUT (form + contexto)
   │
   ▼
[E1] COGNITIVE PROTOCOL ─► { rito, competencia, fase, controversias[],
   │                         fatos_incontroversos[], timeline[],
   │                         provas_classificadas[], riscos[], teses[] }
   ▼
[E2] ADVERSARIAL ANALYSIS ─► { argumentos_contrarios[], vulnerabilidades[],
   │                           neutralizacoes[], antecipacao_juiz[] }
   ▼
[E3] DRAFT (persona+tribunal) ─► markdown da peça (streaming)
   │   - dynamic_persona_engine pela `area`
   │   - tribunal_adaptation_engine pelo campo `tribunal`
   │   - narrative_engine + evidence_engine + jurisprudence_engine
   │   - anti_hallucination_protocol obrigatório
   ▼
[E4] INTERNAL AUDIT ─► { checklist_final[], operator_notes[],
                         risco_geral, lacunas[], placeholders[] }
   │
   ▼
PERSIST: pieces.content_text (markdown), content_html (renderizado),
         checklist (jsonb com saídas E1+E2+E4), observations (operator_notes),
         model_used, status='ready'
```

Detalhes:
- Streaming SSE só na etapa E3 (a única com payload longo). E1/E2/E4 são chamadas curtas e síncronas.
- Modelo padrão: `google/gemini-2.5-pro` para E1/E2/E4 e `google/gemini-2.5-flash` para E3 (mais barato em tokens longos). Configuráveis em `cognitive_os_config.models`.
- `token_usage` registra cada etapa separadamente com `purpose` (`cognitive_protocol`, `adversarial`, `draft`, `audit`).
- Modo BYOK (Mike) preservado: se `userIntegration` ativo, todas as etapas vão para o endpoint Mike.
- Erros em E1/E2/E4 são não-fatais (degradação graciosa para single-call); erro em E3 falha a peça.

---

## 3. UI — `/pecas/nova` expandida

Reescrever `_authenticated.pecas.nova.tsx` em componentes (`src/components/pieces/`):

Seções (todas exceto Conteúdo são opcionais):

1. **Identificação** (já existe) + campo **Posição da parte** (autor/réu/terceiro) + **Tipo de peça** (select: petição inicial, contestação, réplica, recurso, embargos, etc — alimentado por `librarians.model_piece_ids` + presets fixos).
2. **Tribunal & Rito** — tribunal (STF/STJ/TJ/TRT/TRF/Juizado…), instância, rito (comum/sumaríssimo/especial), fase processual.
3. **Partes** (já existe).
4. **Fatos & Provas** — narrativa + lista dinâmica de provas (descrição + classificação `robusta|suficiente|fragil|isolada|contraditoria|dependente`).
5. **Estratégia avançada** (collapsible) — controvérsias conhecidas, teses principais, teses subsidiárias, riscos identificados, jurisprudência preferida.
6. **Conteúdo** — fundamentos, pedidos, valor da causa, contexto.

Validação Zod no client (limites de tamanho, regex em CNJ etc) antes de submit.

**Tela de progresso**: substituir botão único por overlay (reusar `GenerationOverlay` do Visual Law) com 4 steps visíveis:
`Mapeando autos → Análise adversarial → Redigindo peça → Auditoria final`. Cada step marca ✓ conforme SSE/etapa conclui.

---

## 4. Tela `/pecas/$id` — exibir saídas estratégicas

Adicionar abas/painel lateral:
- **Peça** (atual)
- **Inteligência** — renderiza `pieces.checklist` JSON em cards: timeline factual, controvérsias, provas classificadas com badges de cor, antecipação adversarial, lacunas, placeholders.
- **Notas ao operador** — `operator_notes` em lista acionável (cada item com checkbox para marcar resolvido, persistido em `pieces.checklist.operator_notes_resolved`).

---

## 5. Cliente (`src/lib/mikeClient.ts`)

Adicionar `generatePieceCognitive(input, { onStep, onDelta })`:
- POST com `pipeline: "cognitive"` para `mike-generate`.
- Lê SSE com eventos custom `step_start`, `step_done` (E1/E2/E4) e `delta` (E3).

Manter `generatePiece` antigo para compatibilidade (modo legado).

---

## 6. Banco

Sem nova tabela. Usa colunas existentes:
- `pieces.checklist` (jsonb) — passa a guardar `{ cognitive: {...E1}, adversarial: {...E2}, audit: {...E4} }`.
- `pieces.observations` (text) — `operator_notes` concatenadas.
- `pieces.input_data` — form completo (já é jsonb).

Migração apenas para seed da chave `cognitive_os_config`.

---

## Arquivos afetados

**Criar:**
- `src/components/pieces/PieceFormSections.tsx` (Identificação, Tribunal, Partes, FatosProvas, Estrategia, Conteudo)
- `src/components/pieces/PieceGenerationOverlay.tsx`
- `src/components/pieces/IntelligencePanel.tsx`
- `src/components/pieces/OperatorNotesPanel.tsx`
- `src/lib/cognitiveOs.ts` (tipos + schema Zod do JSON + default)
- `supabase/functions/mike-generate/cognitive.ts` (orquestrador das 4 etapas + prompt builders)
- `supabase/functions/mike-generate/prompts.ts` (helpers persona/tribunal/structure)

**Editar:**
- `supabase/functions/mike-generate/index.ts` — branch `pipeline === "cognitive"`
- `src/routes/_authenticated.pecas.nova.tsx` — usar novas seções + overlay + chamada cognitive
- `src/routes/_authenticated.pecas.$id.tsx` — abas + painéis
- `src/lib/mikeClient.ts` — `generatePieceCognitive`
- `src/routes/_authenticated.admin.integracoes.tsx` — editor JSON da config

**Migration:**
- `supabase/migrations/<ts>_seed_cognitive_os_config.sql`

---

## Out of scope (pode virar Etapa 2)

- RAG real de jurisprudência (mantém `[INSERIR JURISPRUDÊNCIA — confirmar]` como placeholder por ora).
- Editor visual da config (entra como JSON puro).
- Cache de E1/E2 entre regerações.
- Agente conversacional para perguntar dados faltantes (continua via formulário).

---

## Smoke test

1. Seed da config aplica.
2. `/pecas/nova` mostra novas seções; submit dispara overlay; 4 steps avançam.
3. Peça final salva com `checklist` populado e `observations` preenchidas.
4. `/pecas/$id` exibe abas Peça / Inteligência / Notas.
5. BYOK (Mike) ainda funciona — usa endpoint do usuário em todas as 4 chamadas.
6. Falha em E1 degrada para chamada única sem quebrar fluxo.
